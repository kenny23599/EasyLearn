import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, Clock, Target, CheckCircle, PlayCircle, Lock, Sparkles, AlertCircle, Edit, Trash2, Plus, X, Save, Play } from 'lucide-react'
import { collection, query, where, getDocs, doc, deleteDoc, updateDoc, addDoc } from 'firebase/firestore'
import { db } from '../../../../backend/firebase'

const LearningPath = ({ user }) => {
  const [studyPlans, setStudyPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editingPlan, setEditingPlan] = useState(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newPlan, setNewPlan] = useState({
    materialName: '',
    daysLimit: 7,
    dailySessions: 2,
    sessionDuration: 25,
    startDate: new Date().toISOString().split('T')[0],
    startTime: '09:00'
  })

  // Fetch study plans from Firestore
  useEffect(() => {
    if (user) {
      fetchStudyPlans()
    }
  }, [user])

  const fetchStudyPlans = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const q = query(
        collection(db, 'plans'),
        where('userId', '==', user.uid)
      )
      
      const querySnapshot = await getDocs(q)
      const plans = []
      
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        plans.push({
          id: doc.id,
          materialName: data.materialName || 'Untitled Material',
          schedule: data.schedule || { 
            daysLimit: 7, 
            dailySessions: 2, 
            sessionDuration: 25,
            startDate: new Date().toISOString().split('T')[0],
            startTime: '09:00'
          },
          progress: data.progress || 0,
          completedSessions: data.completedSessions || 0,
          totalSessions: data.totalSessions || 0,
          duration: data.duration || 0,
          status: data.status || 'active',
          createdAt: data.createdAt || new Date(),
          startDate: data.startDate || new Date().toISOString().split('T')[0]
        })
      })
      
      setStudyPlans(plans)
      
    } catch (err) {
      console.error('Error fetching study plans:', err)
      setError('Failed to load study plans. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleDeletePlan = async (planId) => {
    if (!window.confirm('Are you sure you want to delete this study plan?')) {
      return
    }

    try {
      await deleteDoc(doc(db, 'plans', planId))
      setStudyPlans(prev => prev.filter(plan => plan.id !== planId))
    } catch (err) {
      console.error('Error deleting plan:', err)
      alert('Failed to delete study plan. Please try again.')
    }
  }

  const handleEditPlan = (plan) => {
    setEditingPlan({
      ...plan,
      materialName: plan.materialName,
      daysLimit: plan.schedule.daysLimit,
      dailySessions: plan.schedule.dailySessions,
      sessionDuration: plan.schedule.sessionDuration,
      startDate: plan.schedule.startDate,
      startTime: plan.schedule.startTime
    })
  }

  const handleUpdatePlan = async () => {
    if (!editingPlan.materialName.trim()) {
      alert('Please enter a material name')
      return
    }

    try {
      const updatedData = {
        materialName: editingPlan.materialName,
        schedule: {
          daysLimit: editingPlan.daysLimit,
          dailySessions: editingPlan.dailySessions,
          sessionDuration: editingPlan.sessionDuration,
          startDate: editingPlan.startDate,
          startTime: editingPlan.startTime
        },
        duration: editingPlan.daysLimit * editingPlan.dailySessions * editingPlan.sessionDuration,
        totalSessions: editingPlan.daysLimit * editingPlan.dailySessions,
        lastUpdated: new Date()
      }

      await updateDoc(doc(db, 'plans', editingPlan.id), updatedData)
      
      setStudyPlans(prev => prev.map(plan => 
        plan.id === editingPlan.id 
          ? { 
              ...plan, 
              materialName: editingPlan.materialName,
              schedule: updatedData.schedule,
              duration: updatedData.duration,
              totalSessions: updatedData.totalSessions
            }
          : plan
      ))
      
      setEditingPlan(null)
    } catch (err) {
      console.error('Error updating plan:', err)
      alert('Failed to update study plan. Please try again.')
    }
  }

  const handleCreatePlan = async () => {
    if (!newPlan.materialName.trim()) {
      alert('Please enter a material name')
      return
    }

    try {
      const planData = {
        userId: user.uid,
        materialName: newPlan.materialName,
        schedule: {
          daysLimit: newPlan.daysLimit,
          dailySessions: newPlan.dailySessions,
          sessionDuration: newPlan.sessionDuration,
          startDate: newPlan.startDate,
          startTime: newPlan.startTime
        },
        duration: newPlan.daysLimit * newPlan.dailySessions * newPlan.sessionDuration,
        progress: 0,
        completedSessions: 0,
        totalSessions: newPlan.daysLimit * newPlan.dailySessions,
        status: 'active',
        createdAt: new Date(),
        startDate: newPlan.startDate
      }

      const docRef = await addDoc(collection(db, 'plans'), planData)
      
      setStudyPlans(prev => [...prev, {
        id: docRef.id,
        ...planData
      }])
      
      setShowCreateForm(false)
      setNewPlan({
        materialName: '',
        daysLimit: 7,
        dailySessions: 2,
        sessionDuration: 25,
        startDate: new Date().toISOString().split('T')[0],
        startTime: '09:00'
      })
    } catch (err) {
      console.error('Error creating plan:', err)
      alert('Failed to create study plan. Please try again.')
    }
  }

  const handleStartStudy = (planId) => {
    console.log('Start studying plan:', planId)
    alert(`Starting study session for plan: ${planId}`)
  }

  const getStatusIcon = (progress) => {
    if (progress === 100) return <CheckCircle size={20} color="#10b981" />
    if (progress > 0) return <PlayCircle size={20} color="#3b82f6" />
    return <Lock size={20} color="#94a3b8" />
  }

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
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

  if (loading) {
    return (
      <div className="learningpath-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <h3>Loading your learning paths...</h3>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="learningpath-container">
        <div className="error-state">
          <AlertCircle size={48} color="#ef4444" />
          <h3>Error Loading Study Plans</h3>
          <p>{error}</p>
          <button onClick={fetchStudyPlans} className="retry-button">
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="learningpath-container">
      {/* Header with Create Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="path-header"
      >
        <div className="header-content">
          <div>
            <h1>Your Learning Paths</h1>
            <p>Manage and track your study plans</p>
          </div>
          <button 
            className="create-button"
            onClick={() => setShowCreateForm(true)}
          >
            <Plus size={20} />
            Create Plan
          </button>
        </div>
      </motion.div>

      {/* Create Plan Form */}
      <AnimatePresence>
        {showCreateForm && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="form-modal"
          >
            <div className="form-card">
              <div className="form-header">
                <h3>Create New Study Plan</h3>
                <button 
                  className="close-button"
                  onClick={() => setShowCreateForm(false)}
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="form-content">
                <div className="form-group">
                  <label>Material Name</label>
                  <input
                    type="text"
                    value={newPlan.materialName}
                    onChange={(e) => setNewPlan(prev => ({ ...prev, materialName: e.target.value }))}
                    placeholder="e.g., Advanced Calculus, Physics Fundamentals"
                  />
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Study Days</label>
                    <select
                      value={newPlan.daysLimit}
                      onChange={(e) => setNewPlan(prev => ({ ...prev, daysLimit: parseInt(e.target.value) }))}
                    >
                      {[3, 5, 7, 10, 14, 21, 30].map(days => (
                        <option key={days} value={days}>{days} days</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label>Daily Sessions</label>
                    <select
                      value={newPlan.dailySessions}
                      onChange={(e) => setNewPlan(prev => ({ ...prev, dailySessions: parseInt(e.target.value) }))}
                    >
                      {[1, 2, 3, 4].map(sessions => (
                        <option key={sessions} value={sessions}>{sessions} session{sessions > 1 ? 's' : ''}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label>Session Duration</label>
                    <select
                      value={newPlan.sessionDuration}
                      onChange={(e) => setNewPlan(prev => ({ ...prev, sessionDuration: parseInt(e.target.value) }))}
                    >
                      <option value={15}>15 minutes</option>
                      <option value={25}>25 minutes</option>
                      <option value={45}>45 minutes</option>
                      <option value={60}>60 minutes</option>
                      <option value={90}>90 minutes</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Start Date</label>
                    <input
                      type="date"
                      value={newPlan.startDate}
                      onChange={(e) => setNewPlan(prev => ({ ...prev, startDate: e.target.value }))}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Start Time</label>
                    <select
                      value={newPlan.startTime}
                      onChange={(e) => setNewPlan(prev => ({ ...prev, startTime: e.target.value }))}
                    >
                      {timeOptions.map(time => (
                        <option key={time} value={time}>{time}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="form-actions">
                <button 
                  className="cancel-button"
                  onClick={() => setShowCreateForm(false)}
                >
                  Cancel
                </button>
                <button 
                  className="save-button"
                  onClick={handleCreatePlan}
                >
                  <Save size={16} />
                  Create Plan
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Plan Form */}
      <AnimatePresence>
        {editingPlan && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="form-modal"
          >
            <div className="form-card">
              <div className="form-header">
                <h3>Edit Study Plan</h3>
                <button 
                  className="close-button"
                  onClick={() => setEditingPlan(null)}
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="form-content">
                <div className="form-group">
                  <label>Material Name</label>
                  <input
                    type="text"
                    value={editingPlan.materialName}
                    onChange={(e) => setEditingPlan(prev => ({ ...prev, materialName: e.target.value }))}
                  />
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Study Days</label>
                    <select
                      value={editingPlan.daysLimit}
                      onChange={(e) => setEditingPlan(prev => ({ ...prev, daysLimit: parseInt(e.target.value) }))}
                    >
                      {[3, 5, 7, 10, 14, 21, 30].map(days => (
                        <option key={days} value={days}>{days} days</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label>Daily Sessions</label>
                    <select
                      value={editingPlan.dailySessions}
                      onChange={(e) => setEditingPlan(prev => ({ ...prev, dailySessions: parseInt(e.target.value) }))}
                    >
                      {[1, 2, 3, 4].map(sessions => (
                        <option key={sessions} value={sessions}>{sessions} session{sessions > 1 ? 's' : ''}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label>Session Duration</label>
                    <select
                      value={editingPlan.sessionDuration}
                      onChange={(e) => setEditingPlan(prev => ({ ...prev, sessionDuration: parseInt(e.target.value) }))}
                    >
                      <option value={15}>15 minutes</option>
                      <option value={25}>25 minutes</option>
                      <option value={45}>45 minutes</option>
                      <option value={60}>60 minutes</option>
                      <option value={90}>90 minutes</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Start Date</label>
                    <input
                      type="date"
                      value={editingPlan.startDate}
                      onChange={(e) => setEditingPlan(prev => ({ ...prev, startDate: e.target.value }))}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Start Time</label>
                    <select
                      value={editingPlan.startTime}
                      onChange={(e) => setEditingPlan(prev => ({ ...prev, startTime: e.target.value }))}
                    >
                      {timeOptions.map(time => (
                        <option key={time} value={time}>{time}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="form-actions">
                <button 
                  className="cancel-button"
                  onClick={() => setEditingPlan(null)}
                >
                  Cancel
                </button>
                <button 
                  className="save-button"
                  onClick={handleUpdatePlan}
                >
                  <Save size={16} />
                  Save Changes
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Study Plans Grid */}
      {studyPlans.length === 0 ? (
        <div className="empty-state">
          <BookOpen size={48} color="#94a3b8" />
          <h3>No Study Plans Yet</h3>
          <p>Create your first study plan to get started</p>
          <button 
            className="upload-materials-button"
            onClick={() => setShowCreateForm(true)}
          >
            Create First Plan
          </button>
        </div>
      ) : (
        <div className="plans-grid">
          {studyPlans.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="plan-card"
            >
              <div className="plan-header">
                <div className="plan-icon">
                  {getStatusIcon(plan.progress)}
                </div>
                <div className="plan-info">
                  <h3>{plan.materialName}</h3>
                  <p>{plan.schedule.daysLimit}-day plan • {plan.schedule.dailySessions} sessions/day</p>
                </div>
                <div className="plan-actions">
                  <button 
                    className="icon-button edit"
                    onClick={() => handleEditPlan(plan)}
                    title="Edit plan"
                  >
                    <Edit size={16} />
                  </button>
                  <button 
                    className="icon-button delete"
                    onClick={() => handleDeletePlan(plan.id)}
                    title="Delete plan"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Progress Section */}
              <div className="progress-section">
                <div className="progress-bar">
                  <div 
                    className="progress-fill"
                    style={{ width: `${plan.progress}%` }}
                  />
                </div>
                <div className="progress-text">
                  <span>{plan.progress}% Complete</span>
                  <span>{plan.completedSessions}/{plan.totalSessions} sessions</span>
                </div>
              </div>

              {/* Plan Details */}
              <div className="plan-details">
                <div className="detail-item">
                  <Clock size={16} />
                  <span>Session: {plan.schedule.sessionDuration}min</span>
                </div>
                <div className="detail-item">
                  <Target size={16} />
                  <span>Total: {formatDuration(plan.duration)}</span>
                </div>
              </div>

              {/* Action Button */}
              <button 
                className={`action-buttonL ${plan.progress === 100 ? 'completed' : plan.progress > 0 ? 'in-progress' : 'start'}`}
                onClick={() => handleStartStudy(plan.id)}
              >
                {plan.progress === 100 ? 'Completed' : plan.progress > 0 ? 'Continue' : 'Start Learning'}
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

export default LearningPath