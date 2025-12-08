import React, { useEffect, useState } from 'react'
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc,
  getDocs,
  serverTimestamp 
} from 'firebase/firestore'
import { db, auth } from '../../../../backend/firebase'

const NotificationScheduler = () => {
  const [scheduledTimeouts, setScheduledTimeouts] = useState({})
  const [userPlan, setUserPlan] = useState(null)
  const user = auth.currentUser

  useEffect(() => {
    if (!user) return

    // Fetch user's plan first to get the actual startTime
    fetchUserPlan()
  }, [user])

  useEffect(() => {
    if (!user || !userPlan) return

    // Listen to today's sessions only after we have the plan
    const today = new Date().toISOString().split('T')[0]
    const sessionsQuery = query(
      collection(db, 'sessions'),
      where('userId', '==', user.uid),
      where('date', '==', today),
      where('completed', '==', false)
    )

    const unsubscribe = onSnapshot(sessionsQuery, (snapshot) => {
      const sessions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))

      console.log('Today\'s sessions for notifications:', sessions)
      console.log('Using plan startTime:', userPlan.startTime)

      // Clear existing timeouts
      Object.values(scheduledTimeouts).forEach(timeoutId => {
        clearTimeout(timeoutId)
      })

      // Schedule notifications for each upcoming session
      sessions.forEach(session => {
        scheduleSessionNotification(session)
      })
    })

    return () => {
      unsubscribe()
      // Clean up timeouts
      Object.values(scheduledTimeouts).forEach(timeoutId => {
        clearTimeout(timeoutId)
      })
    }
  }, [user, userPlan])

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
        console.log('User plan loaded for scheduler:', plan)
        
        // Check if startTime exists in the plan
        if (!plan.startTime) {
          console.warn('No startTime found in user plan. Please set startTime in plan data.')
        }
      } else {
        console.log('No plan found for user in scheduler')
      }
    } catch (error) {
      console.error('Error fetching user plan in scheduler:', error)
    }
  }

  const scheduleSessionNotification = (session) => {
    const notificationId = `session_${session.id}`
    
    // Clear existing notification for this session
    if (scheduledTimeouts[notificationId]) {
      clearTimeout(scheduledTimeouts[notificationId])
      console.log('Cleared existing timeout for session:', session.id)
    }

    // Get session time from user plan startTime
    const sessionTime = userPlan?.startTime
    if (!sessionTime) {
      console.error('No startTime found in user plan. Cannot schedule notification.')
      return
    }

    const [hours, minutes] = sessionTime.split(':').map(Number)

    // Calculate notification time (5 minutes before session)
    const today = new Date()
    const sessionDateTime = new Date()
    sessionDateTime.setHours(hours, minutes, 0, 0)
    
    const notificationTime = new Date(sessionDateTime.getTime() - (5 * 60 * 1000)) // 5 minutes before
    const now = new Date()

    let timeUntilNotification = notificationTime.getTime() - now.getTime()

    console.log('Scheduling details:', {
      sessionTitle: session.title,
      planStartTime: sessionTime,
      notificationTime: notificationTime.toLocaleTimeString(),
      now: now.toLocaleTimeString(),
      timeUntilMinutes: Math.round(timeUntilNotification / 1000 / 60)
    })

    // If notification time already passed today, schedule for immediate notification
    if (timeUntilNotification < 0) {
      console.log(`Session time (${sessionTime}) already passed, scheduling immediate notification`)
      timeUntilNotification = 10000 // 10 seconds for immediate testing
    }

    console.log(`Scheduling notification for session "${session.title}" in ${Math.round(timeUntilNotification/1000)} seconds`)

    const timeoutId = setTimeout(() => {
      triggerSessionNotification(session, sessionTime)
    }, timeUntilNotification)

    // Store timeout ID for cleanup
    setScheduledTimeouts(prev => ({
      ...prev,
      [notificationId]: timeoutId
    }))
  }

  const triggerSessionNotification = async (session, sessionTime) => {
    console.log('🔔 Triggering notification for session:', session.title)

    // Request notification permission
    if (Notification.permission !== 'granted') {
      console.log('Requesting notification permission...')
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        console.log('Notification permission denied')
        return
      }
    }

    // Create browser notification
    if (Notification.permission === 'granted') {
      console.log('Creating browser notification...')
      try {
        new Notification('📚 Study Session Reminder!', {
          body: `"${session.title}" starts at ${sessionTime}`,
          icon: '/favicon.ico',
          tag: `session-${session.id}`,
          requireInteraction: true
        })
        console.log('Browser notification created successfully')
      } catch (error) {
        console.error('Error creating browser notification:', error)
      }
    }

    // Save notification to Firestore
    try {
      await addDoc(collection(db, 'notifications'), {
        userId: user.uid,
        title: 'Session Starting Soon',
        message: `"${session.title}" starts at ${sessionTime}`,
        sessionId: session.id,
        type: 'session_reminder',
        timestamp: serverTimestamp(),
        read: false
      })
      console.log('✅ Session notification saved to Firestore')
    } catch (error) {
      console.error('❌ Error saving notification to Firestore:', error)
    }

    // Clean up
    setScheduledTimeouts(prev => {
      const newState = { ...prev }
      delete newState[`session_${session.id}`]
      return newState
    })
  }

  return null
}

export default NotificationScheduler