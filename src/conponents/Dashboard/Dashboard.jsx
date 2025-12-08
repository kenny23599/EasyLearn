import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, Clock, Play, Plus, FileText, Calendar, Target, CheckCircle, Upload, Sparkles, AlertCircle, FolderOpen } from 'lucide-react'
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore'
import { db } from '../../../../backend/firebase'

const Dashboard = ({ user }) => {

    // Get user's first name
  const getUserFirstName = () => {
    if (user?.displayName) {
      return user.displayName.split(' ')[0];
    }
    return user?.email?.split('@')[0] || 'there';
  }

  const userName = getUserFirstName();
  const [stats, setStats] = useState([
    { 
      icon: BookOpen, 
      label: 'Active Plans', 
      value: '0'
    },
    { 
      icon: Clock, 
      label: 'Today\'s Time', 
      value: '0m'
    },
    { 
      icon: Target, 
      label: 'Completed Sessions', 
      value: '0/0'
    }
  ])
  const [uploadedFiles, setUploadedFiles] = useState([])
  const [studyPlans, setStudyPlans] = useState([])
  const [currentPlans, setCurrentPlans] = useState([])
  const [todaysSessions, setTodaysSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [filesLoading, setFilesLoading] = useState(true)
  const [plansLoading, setPlansLoading] = useState(true)

  // Fetch dashboard data from Firebase
  useEffect(() => {
    if (user) {
      fetchDashboardData()
    }
  }, [user])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      // Fetch data sequentially to avoid index issues
      await fetchUploadedFiles()
      await fetchStudyPlans()
      await fetchTodaysSessions()

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      // If there's an index error, try simpler queries
      if (error.code === 'failed-precondition') {
        console.log('Trying simpler queries...')
        await fetchDataWithSimpleQueries()
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchDataWithSimpleQueries = async () => {
    try {
      // Simple query for files - just by user ID
      const filesQuery = query(
        collection(db, 'files'),
        where('userId', '==', user.uid)
      )
      const filesSnapshot = await getDocs(filesQuery)
      const files = filesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        source: 'uploaded',
        createdAt: doc.data().createdAt?.toDate() || new Date()
      }))
      setUploadedFiles(files)

      // Simple query for plans - just by user ID
      const plansQuery = query(
        collection(db, 'plans'),
        where('userId', '==', user.uid)
      )
      const plansSnapshot = await getDocs(plansQuery)
      const allPlans = plansSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        source: 'plan',
        createdAt: doc.data().createdAt?.toDate() || new Date()
      }))
      
      const activePlans = allPlans.filter(plan => plan.status === 'active')
      setStudyPlans(allPlans)
      setCurrentPlans(activePlans)

      // Update stats
      const totalSessions = activePlans.reduce((sum, plan) => sum + (plan.totalSessions || 0), 0)
      const completedSessions = activePlans.reduce((sum, plan) => sum + (plan.completedSessions || 0), 0)
      
      setStats([
        { icon: BookOpen, label: 'Active Plans', value: activePlans.length.toString() },
        { icon: Clock, label: 'Today\'s Time', value: '0m' }, // Will update with sessions
        { icon: Target, label: 'Completed Sessions', value: `${completedSessions}/${totalSessions}` }
      ])

    } catch (error) {
      console.error('Error with simple queries:', error)
    }
  }

  const fetchUploadedFiles = async () => {
    try {
      setFilesLoading(true)
      
      // Try the optimized query first
      try {
        const filesQuery = query(
          collection(db, 'files'),
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc'),
          limit(10)
        )
        const filesSnapshot = await getDocs(filesQuery)
        const files = filesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          source: 'uploaded',
          createdAt: doc.data().createdAt?.toDate() || new Date()
        }))
        setUploadedFiles(files)
      } catch (error) {
        // If optimized query fails, use simple query
        console.log('Falling back to simple files query')
        const filesQuery = query(
          collection(db, 'files'),
          where('userId', '==', user.uid)
        )
        const filesSnapshot = await getDocs(filesQuery)
        const files = filesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          source: 'uploaded',
          createdAt: doc.data().createdAt?.toDate() || new Date()
        }))
        // Sort manually by date
        files.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        setUploadedFiles(files.slice(0, 10)) // Limit manually
      }
      
    } catch (error) {
      console.error('Error fetching uploaded files:', error)
      // Set empty array as fallback
      setUploadedFiles([])
    } finally {
      setFilesLoading(false)
    }
  }

  const fetchStudyPlans = async () => {
    try {
      setPlansLoading(true)
      
      // Try the optimized query first
      try {
        const plansQuery = query(
          collection(db, 'plans'),
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc')
        )
        const plansSnapshot = await getDocs(plansQuery)
        const allPlans = plansSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          source: 'plan',
          createdAt: doc.data().createdAt?.toDate() || new Date()
        }))
        
        const activePlans = allPlans.filter(plan => plan.status === 'active')
        setStudyPlans(allPlans)
        setCurrentPlans(activePlans)

        // Update stats
        const totalSessions = activePlans.reduce((sum, plan) => sum + (plan.totalSessions || 0), 0)
        const completedSessions = activePlans.reduce((sum, plan) => sum + (plan.completedSessions || 0), 0)
        
        setStats(prev => [
          { ...prev[0], value: activePlans.length.toString() },
          prev[1],
          { ...prev[2], value: `${completedSessions}/${totalSessions}` }
        ])

      } catch (error) {
        // If optimized query fails, use simple query
        console.log('Falling back to simple plans query')
        const plansQuery = query(
          collection(db, 'plans'),
          where('userId', '==', user.uid)
        )
        const plansSnapshot = await getDocs(plansQuery)
        const allPlans = plansSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          source: 'plan',
          createdAt: doc.data().createdAt?.toDate() || new Date()
        }))
        // Sort manually by date
        allPlans.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        
        const activePlans = allPlans.filter(plan => plan.status === 'active')
        setStudyPlans(allPlans)
        setCurrentPlans(activePlans)

        // Update stats
        const totalSessions = activePlans.reduce((sum, plan) => sum + (plan.totalSessions || 0), 0)
        const completedSessions = activePlans.reduce((sum, plan) => sum + (plan.completedSessions || 0), 0)
        
        setStats(prev => [
          { ...prev[0], value: activePlans.length.toString() },
          prev[1],
          { ...prev[2], value: `${completedSessions}/${totalSessions}` }
        ])
      }
      
    } catch (error) {
      console.error('Error fetching study plans:', error)
      // Set empty arrays as fallback
      setStudyPlans([])
      setCurrentPlans([])
    } finally {
      setPlansLoading(false)
    }
  }

  const fetchTodaysSessions = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      
      // Try the optimized query first
      try {
        const sessionsQuery = query(
          collection(db, 'sessions'),
          where('userId', '==', user.uid),
          where('date', '==', today),
          orderBy('sessionNumber', 'asc')
        )
        const sessionsSnapshot = await getDocs(sessionsQuery)
        const sessions = sessionsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        
        const todayStudyTime = sessions.reduce((total, session) => {
          return session.completed ? total + (session.duration || 25) : total
        }, 0)

        setTodaysSessions(sessions)
        setStats(prev => [
          prev[0],
          { ...prev[1], value: `${todayStudyTime}m` },
          prev[2]
        ])

      } catch (error) {
        // If optimized query fails, use simple query
        console.log('Falling back to simple sessions query')
        const sessionsQuery = query(
          collection(db, 'sessions'),
          where('userId', '==', user.uid)
        )
        const sessionsSnapshot = await getDocs(sessionsQuery)
        const allSessions = sessionsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        
        // Filter today's sessions manually
        const todaysSessions = allSessions.filter(session => session.date === today)
        todaysSessions.sort((a, b) => (a.sessionNumber || 0) - (b.sessionNumber || 0))
        
        const todayStudyTime = todaysSessions.reduce((total, session) => {
          return session.completed ? total + (session.duration || 25) : total
        }, 0)

        setTodaysSessions(todaysSessions)
        setStats(prev => [
          prev[0],
          { ...prev[1], value: `${todayStudyTime}m` },
          prev[2]
        ])
      }
      
    } catch (error) {
      console.error('Error fetching today\'s sessions:', error)
      setTodaysSessions([])
    }
  }

  // Combine uploaded files and study plans for the materials section
  const getAllMaterials = () => {
    const materials = []
    
    // Add uploaded files
    uploadedFiles.forEach(file => {
      materials.push({
        ...file,
        type: 'file',
        displayName: file.name,
        displayType: 'Uploaded File',
        status: file.status || 'analyzed'
      })
    })
    
    // Add study plans (convert plans to material format)
    studyPlans.forEach(plan => {
      materials.push({
        ...plan,
        type: 'plan',
        displayName: plan.materialName,
        displayType: 'Study Plan',
        status: plan.status === 'active' ? 'active' : 'completed'
      })
    })
    
    // Sort by creation date (newest first)
    return materials.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }

  // Event handlers for navigation
  const handleNavigation = (page) => {
    console.log('Navigating to:', page)
    const event = new CustomEvent('dashboardNavigation', {
      detail: { page, data: {} }
    })
    window.dispatchEvent(event)
  }

  const handleStartSession = (sessionId, planId = null) => {
    console.log('Starting session:', sessionId, 'for plan:', planId)
    alert(`Starting session ${sessionId}. This would open the study session interface.`)
  }

  const handleUploadMaterial = () => {
    console.log('Opening upload material page')
    const event = new CustomEvent('dashboardNavigation', {
      detail: { page: 'upload-material' }
    })
    window.dispatchEvent(event)
  }

  const handleCreatePlanFromFile = (file) => {
    console.log('Creating plan from file:', file)
    alert(`Creating study plan for "${file.name}". This would open the plan creation modal.`)
  }

  const handleViewPlan = (planId) => {
    console.log('Viewing plan:', planId)
    const event = new CustomEvent('dashboardNavigation', {
      detail: { page: 'learning-paths', data: { planId } }
    })
    window.dispatchEvent(event)
  }

  const handleViewFileDetails = (material) => {
    console.log('Viewing material details:', material)
    if (material.type === 'file') {
      alert(`Viewing details for uploaded file "${material.name}".`)
    } else {
      handleViewPlan(material.id)
    }
  }

  const handleViewLearningPaths = () => {
    console.log('Opening learning paths')
    handleNavigation('learning-paths')
  }

  const handleRefreshAll = () => {
    console.log('Refreshing all data')
    fetchDashboardData()
  }

  const formatFileSize = (size) => {
    if (!size) return '0 MB'
    return `${parseFloat(size).toFixed(1)} MB`
  }

  const getMaterialIcon = (material) => {
    if (material.type === 'file') {
      switch (material.status) {
        case 'analyzed':
          return <Sparkles size={16} color="#10b981" />
        case 'processing':
          return <div className="processing-spinner" />
        case 'error':
          return <AlertCircle size={16} color="#ef4444" />
        default:
          return <FileText size={16} color="#6b7280" />
      }
    } else {
      // It's a plan
      return material.progress === 100 ? 
        <CheckCircle size={16} color="#10b981" /> : 
        <FolderOpen size={16} color="#3b82f6" />
    }
  }

  const getMaterialStatusText = (material) => {
    if (material.type === 'file') {
      switch (material.status) {
        case 'analyzed':
          return 'AI Ready'
        case 'processing':
          return 'Processing...'
        case 'error':
          return 'Error'
        default:
          return 'Ready'
      }
    } else {
      // It's a plan
      return material.status === 'active' ? 
        `${material.progress || 0}% Complete` : 
        'Completed'
    }
  }

  const getMaterialAction = (material) => {
    if (material.type === 'file') {
      if (material.status === 'analyzed') {
        return (
          <button 
            className="create-plan-button"
            onClick={(e) => {
              e.stopPropagation()
              handleCreatePlanFromFile(material)
            }}
            title="Create study plan from this file"
          >
            <Sparkles size={14} />
            Create Plan
          </button>
        )
      } else if (material.status === 'error') {
        return (
          <button 
            className="error-button"
            onClick={(e) => {
              e.stopPropagation()
              alert(`File "${material.name}" encountered an error. Please try uploading again.`)
            }}
            title="File upload error - click for details"
          >
            <AlertCircle size={14} />
            Error
          </button>
        )
      }
    } else {
      // It's a plan
      return (
        <button 
          className="view-plan-button"
          onClick={(e) => {
            e.stopPropagation()
            handleViewPlan(material.id)
          }}
          title="View plan details"
        >
          <Play size={14} />
        </button>
      )
    }
    return null
  }

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <h3>Loading dashboard...</h3>
        </div>
      </div>
    )
  }

  const allMaterials = getAllMaterials()

  return (
    <div className="dashboard-container">
      {/* Welcome Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="welcome-banner"
      >
        <h1 className="welcome-title">Welcome back! {userName}👋</h1>
        <p className="welcome-subtitle">Ready for your study sessions today?</p>
      </motion.div>

      {/* Quick Stats */}
      <div className="stats-grid">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="stat-card"
          >
            <div className="stat-icon">
              <stat.icon size={20} />
            </div>
            <div className="stat-value">{stat.value}</div>
            <div className="stat-label">{stat.label}</div>
          </motion.div>
        ))}
      </div>

    
      {/* Main Content Grid */}
      <div className="dashboard-grid">
        {/* All Materials Section (Files + Plans) */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="dashboard-card"
        >
          <div className="card-header">
            <h2>Your Materials</h2>
            <div className="header-actions">
              <button 
                className="refresh-button"
                onClick={handleRefreshAll}
                title="Refresh all materials"
              >
                ↻
              </button>
              <button 
                className="add-button"
                onClick={handleUploadMaterial}
              >
                <Upload size={16} />
                Upload
              </button>
            </div>
          </div>
          
          <div className="materials-list">
            {(filesLoading || plansLoading) ? (
              <div className="loading-state-small">
                <div className="loading-spinner"></div>
                <span>Loading materials...</span>
              </div>
            ) : allMaterials.length === 0 ? (
              <div className="empty-state-small">
                <FileText size={24} />
                <span>No materials yet</span>
                <button 
                  className="upload-cta-button"
                  onClick={handleUploadMaterial}
                >
                  <Upload size={16} />
                  Upload First Material
                </button>
              </div>
            ) : (
              allMaterials.map((material) => (
                <div 
                  key={`${material.type}-${material.id}`} 
                  className="material-item"
                  data-type={material.type}
                  onClick={() => handleViewFileDetails(material)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="file-icon">
                    {getMaterialIcon(material)}
                  </div>
                  <div className="material-info">
                    <span className="material-name" title={material.displayName}>
                      {material.displayName}
                    </span>
                    <div className="file-details">
                      <span className="material-type">{material.displayType}</span>
                      <span className={`file-status ${material.status}`}>
                        {getMaterialStatusText(material)}
                      </span>
                    </div>
                    {material.type === 'file' && material.summary && material.summary !== 'AI analysis pending...' && (
                      <span className="file-summary" title={material.summary}>
                        {material.summary}
                      </span>
                    )}
                    {material.type === 'plan' && (
                      <span className="progress-text">
                        {material.completedSessions || 0}/{material.totalSessions || 0} sessions
                      </span>
                    )}
                  </div>
                  <div className="file-actions">
                    {getMaterialAction(material)}
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Active Study Plans Section */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="dashboard-card"
        >
          <div className="card-header">
            <h2>Active Study Plans</h2>
            <span className="plans-count">{currentPlans.length} active</span>
          </div>
          
          <div className="plans-list">
            {plansLoading ? (
              <div className="loading-state-small">
                <div className="loading-spinner"></div>
                <span>Loading plans...</span>
              </div>
            ) : currentPlans.length === 0 ? (
              <div className="empty-state-small">
                <BookOpen size={24} />
                <span>No active plans</span>
                <button 
                  className="create-cta-button"
                  onClick={handleViewLearningPaths}
                >
                  <Sparkles size={16} />
                  Create Plan
                </button>
              </div>
            ) : (
              currentPlans.map((plan) => (
                <div 
                  key={plan.id} 
                  className="plan-item"
                  onClick={() => handleViewPlan(plan.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="plan-icon">
                    {plan.progress === 100 ? 
                      <CheckCircle size={16} color="#10b981" /> : 
                      <Play size={16} color="#3b82f6" />
                    }
                  </div>
                  <div className="plan-info">
                    <span className="plan-name" title={plan.materialName}>
                      {plan.materialName}
                    </span>
                    <div className="progress-bar">
                      <div 
                        className="progress-fill"
                        style={{ width: `${plan.progress || 0}%` }}
                      />
                    </div>
                    <span className="progress-text">
                      {plan.completedSessions || 0}/{plan.totalSessions || 0} sessions • {plan.progress || 0}%
                    </span>
                  </div>
                  <button 
                    className="view-plan-button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleViewPlan(plan.id)
                    }}
                    title="View plan details"
                  >
                    <Play size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Today's Sessions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="dashboard-card"
        >
          <div className="card-header">
            <h2>Today's Sessions</h2>
            <Calendar size={18} />
          </div>
          
          <div className="sessions-list">
            {todaysSessions.length === 0 ? (
              <div className="empty-state-small">
                <Clock size={24} />
                <span>No sessions scheduled today</span>
              </div>
            ) : (
              todaysSessions.map((session) => (
                <div key={session.id} className="session-item">
                  <div className="session-info">
                    <span className="session-subject">{session.topic || 'Study Session'}</span>
                    <span className="session-time">{session.duration || 25} min</span>
                    <span className="session-number">Session {session.sessionNumber || 1}</span>
                  </div>
                  <button 
                    className={`action-button ${session.completed ? 'completed' : 'start'}`}
                    onClick={() => handleStartSession(session.id, session.planId)}
                    disabled={session.completed}
                  >
                    {session.completed ? (
                      <>
                        <CheckCircle size={16} />
                        Done
                      </>
                    ) : (
                      <>
                        <Play size={16} />
                        Start
                      </>
                    )}
                  </button>
                </div>
              ))
            )}
          </div>
        </motion.div>

        
      </div>
    </div>
  )
}

export default Dashboard