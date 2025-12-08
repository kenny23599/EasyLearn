import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from '../../backend/firebase.js'
import Sidebar from './conponents/UI/Sidebar.jsx'
import Header from './conponents/UI/Header.jsx'
import Dashboard from './conponents/Dashboard/Dashboard.jsx'
import UploadMaterial from './conponents/UploadMaterial/UploadMaterial.jsx'
import DailySession from './conponents/DailySession/DailySession.jsx'
import LearningPath from './conponents/LearningPath/LearningPath.jsx'
import StudySchedule from './conponents/StudySchedule/StudySchedule.jsx'
import Notifications from './conponents/Notifications/Notification.jsx'
import Login from './conponents/Auth/Login.jsx'

// Import all CSS files
import './styles/globals.css'
import './styles/layout.css'
import './styles/card.css'
import './styles/dashboard.css'
import './styles/dailysession.css'
import './styles/uploadmaterial.css'
import './styles/learningpath.css'
import './styles/schedule.css'
import './styles/notification.css'
import './styles/Login.css'

function App() {

  const [activeTab, setActiveTab] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024)
  const [notifications, setNotifications] = useState([])
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Check auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  // Sample notifications data
  useEffect(() => {
    if (user) {
      const sampleNotifications = [
        {
          id: 1,
          type: 'reminder',
          title: 'Study Session Starting Soon',
          message: 'Calculus session starts in 15 minutes',
          time: '2 minutes ago',
          read: false,
          important: true
        },
        {
          id: 2,
          type: 'progress',
          title: 'Daily Goal Completed',
          message: 'You have completed 2/3 sessions today',
          time: '1 hour ago',
          read: false,
          important: false
        },
        {
          id: 3,
          type: 'system',
          title: 'New Material Ready',
          message: 'AI has processed your uploaded document',
          time: '3 hours ago',
          read: true,
          important: false
        }
      ]
      setNotifications(sampleNotifications)
    }
  }, [user])

  // Handle window resize for sidebar
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true)
      } else {
        setSidebarOpen(false)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Render content based on active tab
 // Render content based on active tab
const renderContent = () => {
  switch (activeTab) {
    case 'dashboard':
      return <Dashboard user={user} />
    case 'upload':
      return <UploadMaterial user={user} />
    case 'dailysession':
      return <DailySession user={user} />
    case 'learningpath':
      return <LearningPath user={user}/>
    case 'schedule':
      return <StudySchedule user={user}/>
    case 'notifications':
      return <Notifications notifications={notifications}  unreadCount/>
    default:
      return <Dashboard user={user} />
  }
}
  // Get unread notifications count for badge
  const unreadCount = notifications.filter(n => !n.read).length

  // Handle logout
  const handleLogout = async () => {
    try {
      await signOut(auth)
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <h1>EasyLearn</h1>
      </div>
    )
  }

  if (!user) {
    return <Login onLogin={() => setUser(auth.currentUser)} />
  }

  return (
    <div className="app-container">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        unreadCount={unreadCount}
        onLogout={handleLogout}
      />
      
      <div className="app-main">
        <Header 
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          unreadCount={unreadCount}
          setActiveTab={setActiveTab}
          user={user}
          onLogout={handleLogout}
        />
        
        <main className="app-content">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="page-content"
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}

export default App