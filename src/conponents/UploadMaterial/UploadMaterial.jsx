import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, FileText, X, Sparkles, Calendar, Clock, Sun, AlertCircle, CheckCircle, Cloud, Image, Video, Music, File } from 'lucide-react'
import { collection, addDoc, serverTimestamp, updateDoc, doc } from 'firebase/firestore'
import { db } from '../../../../backend/firebase'

// Cloudinary configuration
const CLOUDINARY_CONFIG = {
  cloudName: 'dokd3wvlc',
  uploadPreset: 'easylearn',
  folder: 'easylearn'
}

const UploadMaterial = ({ user }) => {
  const [uploadedFiles, setUploadedFiles] = useState([])
  const [isDragging, setIsDragging] = useState(false)
  const [showStudyParams, setShowStudyParams] = useState(false)
  const [currentFile, setCurrentFile] = useState(null)
  const [studyParams, setStudyParams] = useState({
    daysLimit: 7,
    dailySessions: 2,
    sessionDuration: 25,
    startDate: new Date().toISOString().split('T')[0],
    startTime: '09:00'
  })
  const [uploading, setUploading] = useState(false)
  const [cloudinaryError, setCloudinaryError] = useState(null)
  const [processingStatus, setProcessingStatus] = useState('')

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    handleFiles(files)
  }

  const handleFileInput = (e) => {
    const files = Array.from(e.target.files)
    handleFiles(files)
  }

  const handleFiles = async (files) => {
    if (!user) {
      alert('Please sign in to upload files')
      return
    }

    setCloudinaryError(null)

    const newFiles = files.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: (file.size / (1024 * 1024)).toFixed(2),
      type: file.type,
      status: 'uploading',
      uploadedAt: new Date(),
      file: file
    }))
    
    setUploadedFiles(prev => [...prev, ...newFiles])
    
    // Upload files to Cloudinary
    for (const fileObj of newFiles) {
      await uploadToCloudinary(fileObj)
    }
  }

  const uploadToCloudinary = async (fileObj) => {
    try {
      setProcessingStatus(`Uploading ${fileObj.name} to Cloudinary...`)

      const formData = new FormData()
      formData.append('file', fileObj.file)
      formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset)
      formData.append('folder', CLOUDINARY_CONFIG.folder)
      formData.append('cloud_name', CLOUDINARY_CONFIG.cloudName)

      // Allow all file types by not restricting the resource type
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/upload`,
        {
          method: 'POST',
          body: formData,
        }
      )

      const result = await response.json()

      if (result.public_id) {
        setProcessingStatus('Saving file metadata...')

        // Determine file category for better organization
        const fileCategory = getFileCategory(fileObj.type, fileObj.name)
        
        // Enhanced file data structure supporting all file types
        const fileData = {
          userId: user.uid,
          name: fileObj.name,
          size: fileObj.size,
          type: fileObj.type,
          category: fileCategory,
          cloudinaryId: result.public_id,
          url: result.secure_url,
          format: result.format,
          bytes: result.bytes,
          resource_type: result.resource_type,
          
          // LLM Processing Fields (only for text-based files)
          extractedText: "",
          textLength: 0,
          processingStatus: fileCategory === 'document' ? "pending" : "not_supported",
          aiSummary: fileCategory === 'document' ? "AI analysis pending..." : "AI analysis not supported for this file type",
          keyTopics: [],
          difficulty: "unknown",
          
          // Enhanced metadata
          summary: fileCategory === 'document' ? 'AI analysis pending...' : 'File uploaded successfully',
          status: fileCategory === 'document' ? 'processing' : 'uploaded',
          createdAt: serverTimestamp(),
          
          // LLM processing tracking
          llmProcessing: {
            textExtraction: fileCategory === 'document' ? "pending" : "not_supported",
            analysis: fileCategory === 'document' ? "pending" : "not_supported",
            lastProcessed: null,
            error: null
          }
        }

        const fileRef = await addDoc(collection(db, 'files'), fileData)
        console.log('✓ File saved with enhanced structure:', fileRef.id)

        // Update UI based on file type
        const updatedStatus = fileCategory === 'document' ? 'processing' : 'uploaded'
        
        setUploadedFiles(prev => 
          prev.map(f => 
            f.id === fileObj.id 
              ? { 
                  ...f, 
                  status: updatedStatus, 
                  firestoreId: fileRef.id,
                  cloudinaryId: result.public_id,
                  url: result.secure_url,
                  summary: fileCategory === 'document' ? 'AI analysis pending...' : 'Ready for study plan',
                  category: fileCategory
                }
              : f
          )
        )

        // Trigger LLM processing only for document files
        if (fileCategory === 'document') {
          await triggerLLMProcessing(fileRef.id, result.secure_url, fileObj.type)
        }

        // Show study parameters for this file
        const updatedFile = { 
          ...fileObj, 
          status: updatedStatus, 
          firestoreId: fileRef.id,
          cloudinaryId: result.public_id,
          url: result.secure_url,
          category: fileCategory
        }
        setCurrentFile(updatedFile)
        setShowStudyParams(true)

      } else {
        throw new Error(result.error?.message || 'Upload failed')
      }

    } catch (error) {
      console.error('Error uploading to Cloudinary:', error)
      setUploadedFiles(prev => 
        prev.map(f => 
          f.id === fileObj.id 
            ? { ...f, status: 'error', error: error.message }
            : f
        )
      )
      setCloudinaryError(`Upload failed: ${error.message}`)
    } finally {
      setProcessingStatus('')
    }
  }

  // Categorize files for better handling
  const getFileCategory = (fileType, fileName) => {
    const extension = fileName.split('.').pop()?.toLowerCase()
    
    // Document files (text-based)
    const documentTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/rtf',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ]
    
    const documentExtensions = ['pdf', 'doc', 'docx', 'txt', 'rtf', 'ppt', 'pptx']
    
    // Image files
    const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg']
    
    // Video files
    const videoTypes = ['video/mp4', 'video/mpeg', 'video/ogg', 'video/webm', 'video/quicktime']
    const videoExtensions = ['mp4', 'mpeg', 'ogg', 'webm', 'mov']
    
    // Audio files
    const audioTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/aac']
    const audioExtensions = ['mp3', 'wav', 'ogg', 'aac']

    if (documentTypes.includes(fileType) || documentExtensions.includes(extension)) {
      return 'document'
    } else if (imageTypes.includes(fileType) || imageExtensions.includes(extension)) {
      return 'image'
    } else if (videoTypes.includes(fileType) || videoExtensions.includes(extension)) {
      return 'video'
    } else if (audioTypes.includes(fileType) || audioExtensions.includes(extension)) {
      return 'audio'
    } else {
      return 'other'
    }
  }

  // Function to trigger LLM processing (would call a Cloud Function)
  const triggerLLMProcessing = async (fileId, fileUrl, fileType) => {
    try {
      // Only process document files
      console.log('Triggering LLM processing for document:', fileId)
      
      // Update file status to show processing
      await updateDoc(doc(db, 'files', fileId), {
        processingStatus: "extracting",
        'llmProcessing.textExtraction': 'in_progress',
        status: 'processing'
      })

      // In real implementation, you would call:
      // await fetch('https://your-cloud-function-url/extractText', {
      //   method: 'POST',
      //   body: JSON.stringify({ fileId, fileUrl, fileType, userId: user.uid })
      // })

    } catch (error) {
      console.error('Error triggering LLM processing:', error)
      await updateDoc(doc(db, 'files', fileId), {
        processingStatus: "error",
        'llmProcessing.textExtraction': 'error',
        'llmProcessing.error': error.message,
        status: 'error'
      })
    }
  }

  const removeFile = async (fileId) => {
    const fileToRemove = uploadedFiles.find(f => f.id === fileId)
    
    if (fileToRemove?.firestoreId) {
      console.log('File would be deleted from Firestore:', fileToRemove.firestoreId)
    }

    setUploadedFiles(prev => prev.filter(file => file.id !== fileId))
    if (currentFile?.id === fileId) {
      setShowStudyParams(false)
      setCurrentFile(null)
    }
  }

  const handleGeneratePlan = async () => {
    if (!user || !currentFile) return

    setUploading(true)
    setCloudinaryError(null)
    setProcessingStatus('Generating study plan...')
    
    try {
      console.log('Starting study plan generation...')
      
      // Enhanced study plan data supporting all file types
      const studyPlanData = {
        userId: user.uid,
        materialName: currentFile.name,
        fileId: currentFile.firestoreId,
        cloudinaryUrl: currentFile.url,
        fileCategory: currentFile.category,
        
        // Study schedule
        schedule: {
          daysLimit: studyParams.daysLimit,
          dailySessions: studyParams.dailySessions,
          sessionDuration: studyParams.sessionDuration,
          startDate: studyParams.startDate,
          startTime: studyParams.startTime
        },
        
        // Calculated fields
        duration: studyParams.daysLimit * studyParams.dailySessions * studyParams.sessionDuration,
        totalSessions: studyParams.daysLimit * studyParams.dailySessions,
        
        // LLM Structure fields (only for documents)
        llmStructure: currentFile.category === 'document' ? {
          summary: "", // Will be populated by LLM
          keyTopics: [], // Will be populated by LLM
          difficulty: "unknown", // Will be determined by LLM
          sessionOutline: [], // Will be generated by LLM
          estimatedHours: 0,
          prerequisites: []
        } : null,
        
        // Generation status
        generationStatus: currentFile.category === 'document' ? "pending" : "manual",
        llmGeneration: currentFile.category === 'document' ? {
          planStructure: "pending",
          sessionOutline: "pending",
          contentGeneration: "pending",
          lastGenerated: null,
          error: null
        } : null,
        
        // Basic plan info
        startDate: studyParams.startDate,
        status: 'active',
        createdAt: serverTimestamp(),
        progress: 0,
        completedSessions: 0,
        currentSession: 0,
        
        // File type specific settings
        studyMode: currentFile.category === 'document' ? 'ai_guided' : 'self_study'
      }

      console.log('Creating enhanced study plan...')
      const studyPlanRef = await addDoc(collection(db, 'plans'), studyPlanData)
      const planId = studyPlanRef.id
      console.log('✓ Enhanced study plan created:', planId)

      setProcessingStatus('Generating session structure...')

      // Trigger LLM study plan generation only for documents
      if (currentFile.category === 'document') {
        await triggerStudyPlanGeneration(planId, currentFile.firestoreId)
      }

      setProcessingStatus('Creating sessions...')

      // Create sessions based on file type
      await createEnhancedSessions(planId, studyPlanData, currentFile.category)

      // Create success notification
      await createNotification(
        user.uid,
        currentFile.category === 'document' 
          ? `🎉 AI is generating your learning path for "${currentFile.name}"! It will be ready soon.`
          : `📚 Study plan created for "${currentFile.name}"! You can now add your own study content.`,
        planId
      )

      // Show success message based on file type
      const successMessage = currentFile.category === 'document' 
        ? '🎉 EasyLearn AI is generating your personalized learning path! Sessions will be available shortly.'
        : `📚 Study plan created for ${currentFile.name}! You can now add your own study materials and notes.`
      
      alert(successMessage)
      
      // Close modal and reset
      setShowStudyParams(false)
      setCurrentFile(null)
      setUploadedFiles(prev => prev.filter(file => file.id !== currentFile.id))

    } catch (error) {
      console.error('Error generating study plan:', error)
      setCloudinaryError(`Failed to generate study plan: ${error.message}`)
      alert('Error generating study plan. Please check console for details.')
    } finally {
      setUploading(false)
      setProcessingStatus('')
    }
  }

  // Function to trigger study plan generation
  const triggerStudyPlanGeneration = async (planId, fileId) => {
    try {
      console.log('Triggering LLM study plan generation for:', planId)
      
      // Update plan status
      await updateDoc(doc(db, 'plans', planId), {
        generationStatus: "generating",
        'llmGeneration.planStructure': 'in_progress'
      })

      // In real implementation, call Cloud Function:
      // await fetch('https://your-cloud-function-url/generateStudyPlan', {
      //   method: 'POST',
      //   body: JSON.stringify({ planId, fileId, userId: user.uid })
      // })

    } catch (error) {
      console.error('Error triggering study plan generation:', error)
      await updateDoc(doc(db, 'plans', planId), {
        generationStatus: "error",
        'llmGeneration.planStructure': 'error',
        'llmGeneration.error': error.message
      })
    }
  }

  const createEnhancedSessions = async (planId, planData, fileCategory) => {
    const sessions = []
    const startDate = new Date(planData.startDate)
    
    for (let day = 0; day < planData.schedule.daysLimit; day++) {
      const currentDate = new Date(startDate)
      currentDate.setDate(startDate.getDate() + day)
      
      for (let session = 0; session < planData.schedule.dailySessions; session++) {
        const sessionNumber = day * planData.schedule.dailySessions + session + 1
        
        // Enhanced session structure supporting all file types
        const sessionData = {
          userId: user.uid,
          planId: planId,
          date: currentDate.toISOString().split('T')[0],
          sessionNumber: sessionNumber,
          
          // Basic session info
          topic: `Session ${sessionNumber} - ${planData.materialName}`,
          duration: planData.schedule.sessionDuration,
          fileCategory: fileCategory,
          
          // AI Content structure (will be populated by LLM for documents)
          aiContent: fileCategory === 'document' ? {
            title: `Session ${sessionNumber}`,
            topics: [],
            content: "AI-generated content will appear here...",
            learningObjectives: [],
            keyPoints: [],
            quiz: [],
            summary: ""
          } : null,
          
          // User progress tracking
          userProgress: {
            completed: false,
            timeSpent: 0,
            quizScore: 0,
            notes: "",
            lastActivity: null,
            quizAnswers: {}
          },
          
          // Generation status
          contentStatus: fileCategory === 'document' ? "pending" : "manual",
          lastUpdated: serverTimestamp(),
          
          // Basic completion tracking
          completed: false,
          completedAt: null,
          createdAt: serverTimestamp()
        }
        
        sessions.push(sessionData)
      }
    }

    // Create session documents in Firestore
    for (const session of sessions) {
      await addDoc(collection(db, 'sessions'), session)
    }
    
    console.log(`✓ Created ${sessions.length} enhanced session placeholders`)
    
    // Trigger session content generation only for documents
    if (fileCategory === 'document') {
      await triggerSessionContentGeneration(planId)
    }
  }

  // Function to trigger session content generation
  const triggerSessionContentGeneration = async (planId) => {
    try {
      console.log('Triggering session content generation for plan:', planId)
      
      // In real implementation, call Cloud Function:
      // await fetch('https://your-cloud-function-url/generateSessions', {
      //   method: 'POST',
      //   body: JSON.stringify({ planId, userId: user.uid })
      // })

    } catch (error) {
      console.error('Error triggering session content generation:', error)
    }
  }

  const createNotification = async (userId, message, planId = null) => {
    const notificationData = {
      userId: userId,
      message: message,
      type: 'plan_created',
      planId: planId,
      read: false,
      timestamp: serverTimestamp()
    }

    await addDoc(collection(db, 'notifications'), notificationData)
  }

  // Generate time options for the time selector
  const generateTimeOptions = () => {
    const times = []
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        times.push(timeString)
      }
    }
    return times
  }

  const timeOptions = generateTimeOptions()

  const getFileIcon = (file) => {
    const category = file.category || getFileCategory(file.type, file.name)
    
    switch (category) {
      case 'document':
        return <FileText size={16} color="#3b82f6" />
      case 'image':
        return <Image size={16} color="#10b981" />
      case 'video':
        return <Video size={16} color="#ef4444" />
      case 'audio':
        return <Music size={16} color="#8b5cf6" />
      default:
        return <File size={16} color="#6b7280" />
    }
  }

  const getFileStatusIcon = (file) => {
    switch (file.status) {
      case 'uploading':
        return <div className="processing-spinner" />
      case 'processing':
        return <Sparkles size={16} color="#3b82f6" />
      case 'uploaded':
      case 'analyzed':
        return <CheckCircle size={16} color="#10b981" />
      case 'error':
        return <AlertCircle size={16} color="#ef4444" />
      default:
        return getFileIcon(file)
    }
  }

  const getFileStatusText = (file) => {
    const category = file.category || getFileCategory(file.type, file.name)
    
    switch (file.status) {
      case 'uploading':
        return 'Uploading to Cloudinary...'
      case 'processing':
        return 'AI Analysis in Progress...'
      case 'uploaded':
        return category === 'document' ? 'Ready for Study Plan' : 'Upload Complete'
      case 'analyzed':
        return 'Ready for Study Plan'
      case 'error':
        return `Error: ${file.error || 'Upload failed'}`
      default:
        return 'Processing...'
    }
  }

  const getSupportedFileTypes = () => {
    return "Supports all file types: PDF, DOC, DOCX, TXT, Images, Videos, Audio, and more!"
  }

  return (
    <div className="uploadmaterial-container">
      {/* Cloudinary Status Banner */}
      <AnimatePresence>
        {cloudinaryError && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="error-banner"
          >
            <AlertCircle size={20} />
            <div>
              <p className="font-medium">Upload Error</p>
              <p className="text-sm">{cloudinaryError}</p>
            </div>
            <button
              onClick={() => setCloudinaryError(null)}
              className="close-error"
            >
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Processing Status */}
      <AnimatePresence>
        {processingStatus && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="processing-banner"
          >
            <Sparkles size={20} />
            <div>
              <p className="font-medium">AI Processing</p>
              <p className="text-sm">{processingStatus}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card glass"
      >
        <div className="upload-header">
          <h1 className="upload-title">Upload Study Material</h1>
          <p className="upload-subtitle">
            Upload any file type and AI will create a personalized learning path
          </p>
          
        </div>

        {/* Upload Zone */}
        <motion.div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`upload-zone ${isDragging ? 'dragging' : ''} ${!user ? 'disabled' : ''}`}
          onClick={() => {
            if (user) {
              document.getElementById('file-input').click()
            } else {
              alert('Please sign in to upload files')
            }
          }}
        >
          <input
            id="file-input"
            type="file"
            multiple
            accept="*/*"
            onChange={handleFileInput}
            className="hidden"
            disabled={!user}
          />
          
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="upload-icon"
          >
            <Upload size={32} />
          </motion.div>
          
          <h3 className="upload-zone-title">
            {user ? 'Drop any study material here' : 'Please sign in to upload files'}
          </h3>
          <p className="upload-zone-subtitle">
            {user ? getSupportedFileTypes() : 'Sign in to start your learning journey'}
          </p>
          <button className="upload-button" disabled={!user}>
            Browse Files
          </button>
        </motion.div>

      
      </motion.div>

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="uploaded-files-container"
        >
          <h2 className="uploaded-files-title">Uploaded Materials</h2>
          <div className="uploaded-files-list">
            <AnimatePresence>
              {uploadedFiles.map((file, index) => (
                <motion.div
                  key={file.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.1 }}
                  className="file-item"
                  data-status={file.status}
                  data-category={file.category || getFileCategory(file.type, file.name)}
                >
                  <div className="file-info">
                    <div className="file-icon">
                      {getFileStatusIcon(file)}
                    </div>
                    <div className="file-details">
                      <h3>{file.name}</h3>
                      <p>{file.size} MB • {getFileStatusText(file)}</p>
                      {file.url && (
                        <p className="file-storage">
                          <Cloud size={12} />
                          {file.status === 'processing' ? 'AI Analysis in Progress...' : 'Stored securely in Cloudinary'}
                          {file.category && file.category !== 'document' && ` • ${file.category.toUpperCase()} FILE`}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="file-actions">
                    {(file.status === 'analyzed' || file.status === 'uploaded') && (
                      <button
                        onClick={() => {
                          setCurrentFile(file)
                          setShowStudyParams(true)
                        }}
                        className="action-button primary"
                      >
                        Set Study Plan
                      </button>
                    )}
                    {file.status === 'processing' && (
                      <button
                        className="action-button processing"
                        disabled
                      >
                        <Sparkles size={14} />
                        AI Processing...
                      </button>
                    )}
                    {file.status === 'error' && (
                      <button
                        onClick={() => removeFile(file.id)}
                        className="action-button error"
                      >
                        Remove
                      </button>
                    )}
                    <button
                      onClick={() => removeFile(file.id)}
                      className="delete-button"
                      title="Remove file"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      )}

      {/* Study Parameters Modal */}
      <AnimatePresence>
        {showStudyParams && currentFile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay"
            onClick={() => setShowStudyParams(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="modal-content"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2 className="modal-title">Set Study Parameters</h2>
                <p className="modal-subtitle">
                  Configure your learning path for "{currentFile.name}"
                  {currentFile.category && currentFile.category !== 'document' && 
                    ` (${currentFile.category.toUpperCase()} file - AI analysis not available)`}
                </p>
                <button
                  onClick={() => setShowStudyParams(false)}
                  className="modal-close"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="study-params-form">
                <div className="param-group">
                  <label className="param-label">
                    <Calendar size={18} />
                    Study Period
                  </label>
                  <p className="param-description">How many days do you want to complete this material?</p>
                  <div className="days-selector">
                    {[3, 5, 7, 10, 14, 21, 30].map(days => (
                      <button
                        key={days}
                        type="button"
                        className={`day-option ${studyParams.daysLimit === days ? 'selected' : ''}`}
                        onClick={() => setStudyParams(prev => ({ ...prev, daysLimit: days }))}
                      >
                        {days} days
                      </button>
                    ))}
                  </div>
                </div>

                <div className="param-group">
                  <label className="param-label">
                    <Sun size={18} />
                    Start Date & Time
                  </label>
                  <p className="param-description">When do you want to start studying?</p>
                  <div className="datetime-selector">
                    <input
                      type="date"
                      value={studyParams.startDate}
                      onChange={(e) => setStudyParams(prev => ({ ...prev, startDate: e.target.value }))}
                      className="date-input"
                    />
                    <select
                      value={studyParams.startTime}
                      onChange={(e) => setStudyParams(prev => ({ ...prev, startTime: e.target.value }))}
                      className="time-input"
                    >
                      {timeOptions.map(time => (
                        <option key={time} value={time}>
                          {time}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="param-group">
                  <label className="param-label">
                    <Clock size={18} />
                    Daily Sessions
                  </label>
                  <p className="param-description">How many study sessions per day?</p>
                  <div className="sessions-selector">
                    {[1, 2, 3, 4].map(sessions => (
                      <button
                        key={sessions}
                        type="button"
                        className={`session-option ${studyParams.dailySessions === sessions ? 'selected' : ''}`}
                        onClick={() => setStudyParams(prev => ({ ...prev, dailySessions: sessions }))}
                      >
                        {sessions} session{sessions > 1 ? 's' : ''}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="param-group">
                  <label className="param-label">
                    Session Duration
                  </label>
                  <p className="param-description">How long should each session be?</p>
                  <div className="duration-selector">
                    <select
                      value={studyParams.sessionDuration}
                      onChange={(e) => setStudyParams(prev => ({ ...prev, sessionDuration: parseInt(e.target.value) }))}
                      className="duration-input"
                    >
                      <option value={15}>15 minutes</option>
                      <option value={25}>25 minutes</option>
                      <option value={45}>45 minutes</option>
                      <option value={60}>60 minutes</option>
                      <option value={90}>90 minutes</option>
                    </select>
                  </div>
                </div>

                <div className="plan-preview">
                  <h4>Your Study Plan Preview</h4>
                  <div className="preview-details">
                    <div className="preview-item">
                      <span>File Type:</span>
                      <strong>{(currentFile.category || getFileCategory(currentFile.type, currentFile.name)).toUpperCase()}</strong>
                    </div>
                    <div className="preview-item">
                      <span>Start Date:</span>
                      <strong>{new Date(studyParams.startDate).toLocaleDateString()}</strong>
                    </div>
                    <div className="preview-item">
                      <span>Start Time:</span>
                      <strong>{studyParams.startTime}</strong>
                    </div>
                    <div className="preview-item">
                      <span>Total Study Days:</span>
                      <strong>{studyParams.daysLimit} days</strong>
                    </div>
                    <div className="preview-item">
                      <span>Daily Sessions:</span>
                      <strong>{studyParams.dailySessions} × {studyParams.sessionDuration}min</strong>
                    </div>
                    <div className="preview-item">
                      <span>Total Sessions:</span>
                      <strong>{studyParams.daysLimit * studyParams.dailySessions} sessions</strong>
                    </div>
                    <div className="preview-item">
                      <span>AI Features:</span>
                      <strong>
                        {currentFile.category === 'document' 
                          ? 'Content + Quizzes + Progress Tracking' 
                          : 'Manual Study + Progress Tracking'}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-actions">
                <button
                  onClick={() => setShowStudyParams(false)}
                  className="action-button secondary"
                  disabled={uploading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleGeneratePlan}
                  className="action-button primary"
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <div className="spinner"></div>
                      {currentFile.category === 'document' ? 'AI Generating...' : 'Creating Plan...'}
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      {currentFile.category === 'document' ? 'Generate AI Learning Path' : 'Create Study Plan'}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default UploadMaterial