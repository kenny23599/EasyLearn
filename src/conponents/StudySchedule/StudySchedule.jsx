import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Calendar, Clock, BookOpen, Target, CheckCircle, PlayCircle, Plus } from 'lucide-react'

const StudySchedule = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [view, setView] = useState('week') // 'week' or 'month'

  // Sample schedule data
  const weeklySchedule = {
    week: "Nov 27 - Dec 3",
    progress: 65,
    totalSessions: 20,
    completedSessions: 13,
    dailyGoal: "2 sessions",
    
    days: [
      {
        date: "2023-11-27",
        day: "Monday",
        sessions: [
          { time: "09:00", title: "Calculus: Derivatives", material: "Advanced Calculus.pdf", duration: 25, completed: true },
          { time: "14:00", title: "Physics: Motion", material: "Physics Fundamentals.docx", duration: 25, completed: true }
        ]
      },
      {
        date: "2023-11-28",
        day: "Tuesday", 
        sessions: [
          { time: "10:00", title: "Calculus: Chain Rule", material: "Advanced Calculus.pdf", duration: 25, completed: true },
          { time: "16:00", title: "Chemistry: Bonds", material: "Organic Chemistry.pdf", duration: 25, completed: false }
        ]
      },
      {
        date: "2023-11-29",
        day: "Wednesday",
        sessions: [
          { time: "09:00", title: "Physics: Energy", material: "Physics Fundamentals.docx", duration: 25, completed: false },
          { time: "14:00", title: "Break Session", material: null, duration: 5, completed: false }
        ]
      },
      {
        date: "2023-11-30",
        day: "Thursday",
        sessions: [
          { time: "11:00", title: "Calculus: Applications", material: "Advanced Calculus.pdf", duration: 25, completed: false },
          { time: "15:00", title: "Chemistry: Reactions", material: "Organic Chemistry.pdf", duration: 25, completed: false }
        ]
      },
      {
        date: "2023-12-01", 
        day: "Friday",
        sessions: [
          { time: "10:00", title: "Physics: Waves", material: "Physics Fundamentals.docx", duration: 25, completed: false },
          { time: "14:00", title: "Weekly Review", material: "All Materials", duration: 25, completed: false }
        ]
      },
      {
        date: "2023-12-02",
        day: "Saturday", 
        sessions: [
          { time: "13:00", title: "Practice Problems", material: "Practice Set.pdf", duration: 25, completed: false }
        ]
      },
      {
        date: "2023-12-03",
        day: "Sunday",
        sessions: [
          { time: "15:00", title: "Break Session", material: null, duration: 5, completed: false }
        ]
      }
    ]
  }

  const todaySchedule = weeklySchedule.days.find(day => day.date === selectedDate) || weeklySchedule.days[0]

  // Calculate some stats
  const totalStudyTime = weeklySchedule.days.reduce((total, day) => {
    return total + day.sessions.reduce((dayTotal, session) => dayTotal + session.duration, 0)
  }, 0)

  const completedStudyTime = weeklySchedule.days.reduce((total, day) => {
    return total + day.sessions
      .filter(session => session.completed)
      .reduce((dayTotal, session) => dayTotal + session.duration, 0)
  }, 0)

  const getUpcomingSessions = () => {
    const now = new Date()
    const currentTime = now.toTimeString().slice(0,5) // "HH:MM"
    
    return weeklySchedule.days.flatMap(day => 
      day.sessions
        .filter(session => !session.completed)
        .map(session => ({
          ...session,
          date: day.date,
          day: day.day
        }))
    ).slice(0, 3) // Show next 3 sessions
  }

  const upcomingSessions = getUpcomingSessions()

  return (
    <div className="studyschedule-container">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="schedule-header"
      >
        <div className="header-content">
          <div>
            <h1>Study Schedule</h1>
            <p>Your AI-generated study plan for the week</p>
          </div>
          <div className="schedule-stats">
            <div className="stat">
              <div className="stat-value">{weeklySchedule.completedSessions}/{weeklySchedule.totalSessions}</div>
              <div className="stat-label">Sessions</div>
            </div>
            <div className="stat">
              <div className="stat-value">{Math.round(completedStudyTime/60)}h</div>
              <div className="stat-label">Study Time</div>
            </div>
            <div className="stat">
              <div className="stat-value">{weeklySchedule.progress}%</div>
              <div className="stat-label">Progress</div>
            </div>
          </div>
        </div>

        {/* Week Navigation */}
        <div className="week-navigation">
          <span className="week-range">{weeklySchedule.week}</span>
          <div className="view-toggle">
            <button 
              className={`view-button ${view === 'week' ? 'active' : ''}`}
              onClick={() => setView('week')}
            >
              Week
            </button>
            <button 
              className={`view-button ${view === 'month' ? 'active' : ''}`}
              onClick={() => setView('month')}
            >
              Month
            </button>
          </div>
        </div>
      </motion.div>

      <div className="schedule-content">
        {/* Left Column - Weekly Overview */}
        <div className="left-column">
          {/* Weekly Calendar */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="weekly-calendar"
          >
            <h2>This Week</h2>
            <div className="days-grid">
              {weeklySchedule.days.map((day, index) => (
                <motion.button
                  key={day.date}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => setSelectedDate(day.date)}
                  className={`day-card ${day.date === selectedDate ? 'active' : ''}`}
                >
                  <div className="day-header">
                    <span className="day-name">{day.day.slice(0, 3)}</span>
                    <span className="date-number">{new Date(day.date).getDate()}</span>
                  </div>
                  
                  <div className="sessions-count">
                    {day.sessions.filter(s => s.completed).length}/{day.sessions.length}
                  </div>
                  
                  <div className="session-dots">
                    {day.sessions.map((session, sessionIndex) => (
                      <div
                        key={sessionIndex}
                        className={`session-dot ${session.completed ? 'completed' : ''}`}
                      />
                    ))}
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>

          {/* Upcoming Sessions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="upcoming-sessions"
          >
            <h3>
              <Clock size={20} />
              Upcoming Sessions
            </h3>
            <div className="upcoming-list">
              {upcomingSessions.map((session, index) => (
                <div key={index} className="upcoming-item">
                  <div className="session-time">{session.time}</div>
                  <div className="session-info">
                    <span className="session-title">{session.title}</span>
                    <span className="session-day">{session.day}</span>
                  </div>
                  <button className="start-button">
                    <PlayCircle size={16} />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Right Column - Day Details */}
        <div className="right-column">
          <motion.div
            key={selectedDate}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="day-details"
          >
            <div className="day-header">
              <h2>{todaySchedule.day}</h2>
              <div className="day-stats">
                <span>{todaySchedule.sessions.filter(s => s.completed).length} of {todaySchedule.sessions.length} sessions completed</span>
              </div>
            </div>

            {/* Today's Sessions */}
            <div className="sessions-list">
              <h3>Today's Schedule</h3>
              {todaySchedule.sessions.map((session, index) => (
                <div key={index} className={`session-item ${session.completed ? 'completed' : ''}`}>
                  <div className="session-time">
                    {session.time}
                  </div>
                  
                  <div className="session-content">
                    <div className="session-header">
                      <span className="session-title">{session.title}</span>
                      {session.completed ? (
                        <CheckCircle size={16} color="#10b981" />
                      ) : (
                        <button className="start-session-btn">
                          <PlayCircle size={16} />
                          Start
                        </button>
                      )}
                    </div>
                    
                    {session.material && (
                      <div className="session-material">
                        <BookOpen size={14} />
                        <span>{session.material}</span>
                      </div>
                    )}
                    
                    <div className="session-meta">
                      <Clock size={14} />
                      <span>{session.duration} minutes</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Daily Goal */}
            <div className="daily-goal">
              <h3>Daily Goal</h3>
              <div className="goal-progress">
                <div className="goal-text">
                  <Target size={20} />
                  <span>Complete {weeklySchedule.dailyGoal}</span>
                </div>
                <div className="progress-circle">
                  <div className="progress-text">
                    {todaySchedule.sessions.filter(s => s.completed).length}/{todaySchedule.sessions.length}
                  </div>
                </div>
              </div>
            </div>

            {/* Add Session Button */}
            <button className="add-session-btn">
              <Plus size={16} />
              Add Custom Session
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

export default StudySchedule