import React, { useState, useEffect } from 'react'
import { Bell, Clock, Check, X, Plus, Trash2, Calendar, Settings } from 'lucide-react'
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  updateDoc,
  doc,
  deleteDoc,
  addDoc,
  getDocs,
  serverTimestamp
} from 'firebase/firestore'
import { db, auth } from '../../../../backend/firebase'

const Notifications = () => {
  const [notifications, setNotifications] = useState([])
  const [todaySessions, setTodaySessions] = useState([])
  const [userPlan, setUserPlan] = useState(null)
  const [showSessionForm, setShowSessionForm] = useState(false)
  const [newSession, setNewSession] = useState({
    title: '',
    date: new Date().toISOString().split('T')[0] // Today's date
  })
  const [loading, setLoading] = useState(true)

  const user = auth.currentUser
  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    if (!user) return

    console.log('Setting up listeners for today:', today)

    // Fetch user's plan
    fetchUserPlan()

    // Listen for ALL notifications (not just today's - for better UX)
    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('timestamp', 'desc')
    )

    const unsubscribeNotifications = onSnapshot(notificationsQuery, (snapshot) => {
      const allNotifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      
      console.log('All notifications:', allNotifications)
      
      // Filter for today's notifications in UI if needed, but show all for now
      setNotifications(allNotifications)
      setLoading(false)
    })

    // Listen for TODAY'S sessions only
    const sessionsQuery = query(
      collection(db, 'sessions'),
      where('userId', '==', user.uid),
      where('date', '==', today)
    )

    const unsubscribeSessions = onSnapshot(sessionsQuery, (snapshot) => {
      const sessionsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      
      console.log('Today\'s sessions:', sessionsData)
      setTodaySessions(sessionsData)
    }, (error) => {
      console.error('Error listening to sessions:', error)
    })

    return () => {
      unsubscribeNotifications()
      unsubscribeSessions()
    }
  }, [user, today])

  const fetchUserPlan = async () => {
    try {
      const plansQuery = query(
        collection(db, 'plans'),
        where('userId', '==', user.uid)
      )
      const plansSnapshot = await getDocs(plansQuery)
      
      if (!plansSnapshot.empty) {
        const plan = plansSnapshot.docs[0].data()
        setUserPlan(plan)
        console.log('User plan loaded:', plan)
      } else {
        console.log('No plan found for user')
        setUserPlan({ schedule: { time: '09:00' } }) // Default time
      }
    } catch (error) {
      console.error('Error fetching user plan:', error)
      setUserPlan({ schedule: { time: '09:00' } }) // Default time on error
    }
  }

  // Add new session for TODAY with proper date
  const addNewSession = async (e) => {
    e.preventDefault()
    if (!user || !newSession.title) return

    try {
      const sessionTime = userPlan?.schedule?.time || '09:00'
      
      const sessionData = {
        userId: user.uid,
        title: newSession.title,
        date: today, // Always use today's date
        scheduledTime: sessionTime,
        completed: false,
        createdAt: serverTimestamp()
      }

      console.log('Adding session for today:', sessionData)
      
      const sessionRef = await addDoc(collection(db, 'sessions'), sessionData)

      // Reset form
      setNewSession({ 
        title: '', 
        date: today 
      })
      setShowSessionForm(false)

      // Add immediate confirmation notification
      await addDoc(collection(db, 'notifications'), {
        userId: user.uid,
        title: 'Session Scheduled ✅',
        message: `"${sessionData.title}" scheduled for today at ${sessionTime}. You'll be notified 5 minutes before.`,
        sessionId: sessionRef.id,
        type: 'session_scheduled',
        timestamp: serverTimestamp(),
        read: false
      })

      console.log('Session created and confirmation notification sent')

    } catch (error) {
      console.error('Error adding session:', error)
    }
  }

  // Get session time display - from plan
  const getSessionTimeDisplay = () => {
    return userPlan?.schedule?.time || '09:00'
  }

  // Get session status with plan time
  const getSessionStatus = (session) => {
    const timeDisplay = getSessionTimeDisplay()
    if (session.completed) {
      return '✅ Completed'
    } else {
      return `⏰ ${timeDisplay}`
    }
  }

  // Calculate next notification time based on plan
  const getNextNotificationTime = () => {
    const sessionTime = getSessionTimeDisplay()
    const [hours, minutes] = sessionTime.split(':').map(Number)
    
    const now = new Date()
    const sessionDateTime = new Date()
    sessionDateTime.setHours(hours, minutes, 0, 0)
    
    const notificationTime = new Date(sessionDateTime.getTime() - (5 * 60 * 1000))
    
    if (notificationTime < now) {
      return 'Today - already passed'
    }
    
    return notificationTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  // Complete session and send completion notification
  const toggleSessionCompletion = async (sessionId, completed) => {
    if (!user) return

    try {
      const session = todaySessions.find(s => s.id === sessionId)
      const newCompletedState = !completed

      const sessionRef = doc(db, 'sessions', sessionId)
      await updateDoc(sessionRef, {
        completed: newCompletedState,
        updatedAt: serverTimestamp()
      })

      // Send completion notification
      if (newCompletedState) {
        await addDoc(collection(db, 'notifications'), {
          userId: user.uid,
          title: 'Session Completed! 🎉',
          message: `Great job completing "${session.title}"!`,
          sessionId: sessionId,
          type: 'session_completed',
          timestamp: serverTimestamp(),
          read: false
        })
      }

    } catch (error) {
      console.error('Error updating session:', error)
    }
  }

  // Delete session and send cancellation notification
  const deleteSession = async (sessionId) => {
    if (!user) return

    try {
      const session = todaySessions.find(s => s.id === sessionId)
      
      await deleteDoc(doc(db, 'sessions', sessionId))
      
      // Send cancellation notification
      await addDoc(collection(db, 'notifications'), {
        userId: user.uid,
        title: 'Session Cancelled',
        message: `"${session.title}" has been removed`,
        type: 'session_cancelled',
        timestamp: serverTimestamp(),
        read: false
      })

    } catch (error) {
      console.error('Error deleting session:', error)
    }
  }

  // Manual test notification with plan time
  const testNotification = async () => {
    // Request permission first
    if (Notification.permission !== 'granted') {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        alert('Please allow notifications to test them')
        return
      }
    }

    const sessionTime = getSessionTimeDisplay()

    // Create browser notification
    if (Notification.permission === 'granted') {
      new Notification('🔔 Test Notification', {
        body: `This is a test! Your sessions are scheduled for ${sessionTime}`,
        icon: '/favicon.ico',
        requireInteraction: true
      })
    }

    // Save test notification to Firestore
    await addDoc(collection(db, 'notifications'), {
      userId: user.uid,
      title: 'Test Notification',
      message: `This is a test notification. Your session time is ${sessionTime}`,
      type: 'test',
      timestamp: serverTimestamp(),
      read: false
    })
  }

  const markAsRead = async (notificationId) => {
    if (!user) return
    try {
      const notificationRef = doc(db, 'notifications', notificationId)
      await updateDoc(notificationRef, {
        read: true,
        readAt: serverTimestamp()
      })
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const deleteNotification = async (notificationId) => {
    if (!user) return
    try {
      await deleteDoc(doc(db, 'notifications', notificationId))
    } catch (error) {
      console.error('Error deleting notification:', error)
    }
  }

  const formatTime = (timestamp) => {
    if (!timestamp) return 'Just now'
    try {
      const date = timestamp.toDate()
      const now = new Date()
      const diffInMinutes = Math.floor((now - date) / (1000 * 60))
      
      if (diffInMinutes < 1) return 'Just now'
      if (diffInMinutes < 60) return `${diffInMinutes}m ago`
      
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch (error) {
      return 'Recently'
    }
  }

  const unreadCount = notifications.filter(n => !n.read).length
  const upcomingSessions = todaySessions.filter(s => !s.completed)
  const completedSessions = todaySessions.filter(s => s.completed)

  const getSessionTitle = (session) => {
    return session.title || 'Daily Session'
  }

  if (loading) {
    return <div className="loading">Loading...</div>
  }

  return (
    <div className="notifications-container">
      <div className="header_N">
        <div className="header-content">
          <Bell size={32} />
          <div>
            <h1>Daily Sessions & Notifications</h1>
            <p>
              {userPlan?.schedule?.time ? (
                <>Sessions at <strong>{userPlan.schedule.time}</strong> (notified 5 minutes before)</>
              ) : (
                <>Using default time: <strong>09:00</strong></>
              )}
            </p>
          </div>
        </div>
        <div className="header-stats">
          <div className="stat">
            <span className="stat-number">{unreadCount}</span>
            <span className="stat-label">Unread</span>
          </div>
          <div className="stat">
            <span className="stat-number">{todaySessions.length}</span>
            <span className="stat-label">Sessions</span>
          </div>
        </div>
      </div>

      <div className="layout">
        {/* Left Side - Sessions */}
        <div className="side-panel">
          <div className="card">
            <div className="card-header">
              <h3>Today's Sessions</h3>
              <button 
                onClick={() => setShowSessionForm(true)}
                className="icon-button"
              >
                <Plus size={20} />
              </button>
            </div>

            {/* Plan Info */}
            <div className="plan-info">
              <Calendar size={16} />
              <div>
                <span>Daily at <strong>{getSessionTimeDisplay()}</strong></span>
                
              </div>
            </div>

            {showSessionForm && (
              <div className="session-form">
                <h4>Add Today's Session</h4>
                <form onSubmit={addNewSession}>
                  <input
                    type="text"
                    placeholder="What are you working on? *"
                    value={newSession.title}
                    onChange={(e) => setNewSession({...newSession, title: e.target.value})}
                    required
                  />
                  <div className="form-actions">
                    <button type="button" onClick={() => setShowSessionForm(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="primary">
                      Add Session
                    </button>
                  </div>
                </form>
              </div>
            )}

            {todaySessions.length === 0 ? (
              <div className="empty-state">
                <Clock size={40} />
                <p>No sessions today</p>
                <button 
                  onClick={() => setShowSessionForm(true)}
                  className="text-button"
                >
                  Add your first session
                </button>
              </div>
            ) : (
              <div className="sessions-list">
                {/* Upcoming Sessions */}
                {upcomingSessions.length > 0 && (
                  <div className="session-group">
                    <h4>Upcoming ({upcomingSessions.length})</h4>
                    {upcomingSessions.map(session => (
                      <div key={session.id} className="session-item">
                        <div className="session-info">
                          <strong>{getSessionTitle(session)}</strong>
                          <span className="status pending">
                            {getSessionStatus(session)}
                          </span>
                        </div>
                        <div className="session-actions">
                          <button 
                            onClick={() => toggleSessionCompletion(session.id, session.completed)}
                            className="action-btn"
                          >
                            <Check size={14} />
                          </button>
                          <button 
                            onClick={() => deleteSession(session.id)}
                            className="action-btn delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Completed Sessions */}
                {completedSessions.length > 0 && (
                  <div className="session-group">
                    <h4>Completed ({completedSessions.length})</h4>
                    {completedSessions.map(session => (
                      <div key={session.id} className="session-item completed">
                        <div className="session-info">
                          <strong>{getSessionTitle(session)}</strong>
                          <span className="status completed">
                            {getSessionStatus(session)}
                          </span>
                        </div>
                        <div className="session-actions">
                          <button 
                            onClick={() => toggleSessionCompletion(session.id, session.completed)}
                            className="action-btn completed"
                          >
                            <Check size={14} />
                          </button>
                          <button 
                            onClick={() => deleteSession(session.id)}
                            className="action-btn delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Notification Test */}
          <div className="card">
            <div className="notification-test">
              <h4>Test Notifications</h4>
              <p>Check if browser notifications work</p>
              <button onClick={testNotification} className="test-button">
                <Bell size={16} />
                Test Notification
              </button>
            </div>
          </div>
        </div>

        {/* Right Side - Notifications */}
        <div className="main-panel">
          <div className="card">
            <div className="card-header">
              <h3>Notifications</h3>
              <span>{notifications.length} total</span>
            </div>

            <div className="notifications-list">
              {notifications.map(notification => (
                <div
                  key={notification.id}
                  className={`notification-item ${notification.read ? 'read' : 'unread'}`}
                >
                  <div className="notification-icon">
                    <Bell size={20} color={notification.read ? "#94a3b8" : "#3b82f6"} />
                  </div>
                  <div className="notification-content">
                    <div className="notification-header">
                      <h4>{notification.title || 'Notification'}</h4>
                      <p>{notification.message || 'No message'}</p>
                    </div>
                    <div className="notification-footer">
                      <span className="time">{formatTime(notification.timestamp)}</span>
                      <div className="actions">
                        {!notification.read && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="action-btn"
                          >
                            <Check size={14} />
                          </button>
                        )}
                        <button
                          onClick={() => deleteNotification(notification.id)}
                          className="action-btn delete"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {notifications.length === 0 && (
              <div className="empty-state">
                <Bell size={40} />
                <p>No notifications yet</p>
                <small>
                  Notifications will appear here when sessions are scheduled, completed, or reminders are sent
                </small>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Notifications