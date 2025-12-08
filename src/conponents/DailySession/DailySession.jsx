import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Clock, 
  Play, 
  Pause, 
  Square, 
  CheckCircle, 
  Plus, 
  Trash2,
  Edit3,
  Save,
  BookOpen,
  Target,
  ChevronRight,
  ChevronDown,
  Star,
  HelpCircle,
  BarChart3,
  Lightbulb,
  FileText,
  Sparkles,
  Calendar,
  Users,
  Bookmark,
  X,
  ArrowLeft,
  ArrowRight,
  Home,
  Maximize2,
  Minimize2,
  Volume2,
  Share2,
  Download,
  Brain,
  Award,
  ChevronUp,
  Menu,
  Bell,
  Search,
  Zap,
  Target as TargetIcon,
  Book,
  Layers,
  User,
  Settings
} from 'lucide-react'
import { 
  collection, 
  query, 
  where, 
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore'
import { db, auth } from '../../../../backend/firebase'

const DailySession = () => {
  const [sessions, setSessions] = useState([])
  const [activeSession, setActiveSession] = useState(null)
  const [timer, setTimer] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [showNewSessionForm, setShowNewSessionForm] = useState(false)
  const [newSession, setNewSession] = useState({
    title: '',
    topic: '',
    notes: ''
  })
  const [editingNotes, setEditingNotes] = useState(null)
  const [notesContent, setNotesContent] = useState('')
  const [expandedSections, setExpandedSections] = useState({
    content: true,
    objectives: true,
    quiz: false
  })
  const [quizAnswers, setQuizAnswers] = useState({})
  const [showQuizResults, setShowQuizResults] = useState(false)
  const [activeTab, setActiveTab] = useState('upcoming')
  
  // New modal states
  const [showSessionModal, setShowSessionModal] = useState(false)
  const [modalMode, setModalMode] = useState('content') // 'content' or 'quiz'
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [sessionCompleted, setSessionCompleted] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)

  const user = auth.currentUser
  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    if (!user) return

    const sessionsQuery = query(
      collection(db, 'sessions'),
      where('userId', '==', user.uid),
      where('date', '==', today)
    )

    const unsubscribe = onSnapshot(sessionsQuery, (snapshot) => {
      const sessionsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setSessions(sessionsData)
    })

    return () => unsubscribe()
  }, [user])

  useEffect(() => {
    let interval = null
    
    if (isRunning && showSessionModal) {
      interval = setInterval(() => {
        setTimer(timer => timer + 1)
      }, 1000)
    }
    
    return () => clearInterval(interval)
  }, [isRunning, showSessionModal])

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const startSession = (session) => {
    setActiveSession(session)
    setTimer(0)
    setIsRunning(true)
    setQuizAnswers({})
    setShowQuizResults(false)
    setModalMode('content')
    setCurrentQuestion(0)
    setSessionCompleted(false)
    setShowConfetti(false)
    setShowSessionModal(true)
    
    // Lock body scroll
    document.body.style.overflow = 'hidden'
  }

  const pauseSession = () => {
    setIsRunning(false)
  }

  const resumeSession = () => {
    setIsRunning(true)
  }

  const stopSession = () => {
    closeSessionModal()
  }

  const completeSession = async (sessionId) => {
    try {
      // Calculate quiz score
      let quizScore = 0
      if (activeSession?.aiContent?.quiz) {
        const quiz = activeSession.aiContent.quiz
        let correctAnswers = 0
        quiz.forEach(question => {
          if (quizAnswers[question.id] === question.correctAnswer) {
            correctAnswers++
          }
        })
        quizScore = Math.round((correctAnswers / quiz.length) * 100)
      }

      await updateDoc(doc(db, 'sessions', sessionId), {
        completed: true,
        completedAt: serverTimestamp(),
        'userProgress.completed': true,
        'userProgress.timeSpent': timer,
        'userProgress.quizScore': quizScore,
        'userProgress.quizAnswers': quizAnswers
      })
      
      // Switch to quiz mode automatically
      setModalMode('quiz')
      setSessionCompleted(true)
      setShowConfetti(true)
      
      // Hide confetti after 3 seconds
      setTimeout(() => setShowConfetti(false), 3000)
      
    } catch (error) {
      console.error('Error completing session:', error)
    }
  }

  const closeSessionModal = () => {
    setShowSessionModal(false)
    setActiveSession(null)
    setTimer(0)
    setIsRunning(false)
    document.body.style.overflow = 'auto'
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setFullscreen(true)
    } else {
      document.exitFullscreen()
      setFullscreen(false)
    }
  }

  const addNewSession = async (e) => {
    e.preventDefault()
    if (!user || !newSession.title) return

    try {
      const sessionData = {
        userId: user.uid,
        title: newSession.title,
        topic: newSession.topic,
        notes: newSession.notes,
        date: today,
        completed: false,
        createdAt: serverTimestamp()
      }

      await addDoc(collection(db, 'sessions'), sessionData)
      setNewSession({ title: '', topic: '', notes: '' })
      setShowNewSessionForm(false)
    } catch (error) {
      console.error('Error adding session:', error)
    }
  }

  const deleteSession = async (sessionId) => {
    if (!user) return
    try {
      await deleteDoc(doc(db, 'sessions', sessionId))
    } catch (error) {
      console.error('Error deleting session:', error)
    }
  }

  const startEditingNotes = (session) => {
    setEditingNotes(session.id)
    setNotesContent(session.notes || '')
  }

  const saveNotes = async (sessionId) => {
    try {
      await updateDoc(doc(db, 'sessions', sessionId), {
        notes: notesContent,
        updatedAt: serverTimestamp()
      })
      setEditingNotes(null)
    } catch (error) {
      console.error('Error saving notes:', error)
    }
  }

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const handleQuizAnswer = (questionId, answerIndex) => {
    setQuizAnswers(prev => ({
      ...prev,
      [questionId]: answerIndex
    }))
  }

  const submitQuiz = async () => {
    if (!activeSession?.aiContent?.quiz) return

    const quiz = activeSession.aiContent.quiz
    let correctAnswers = 0

    quiz.forEach(question => {
      if (quizAnswers[question.id] === question.correctAnswer) {
        correctAnswers++
      }
    })

    const score = Math.round((correctAnswers / quiz.length) * 100)

    try {
      await updateDoc(doc(db, 'sessions', activeSession.id), {
        'userProgress.quizScore': score,
        'userProgress.quizAnswers': quizAnswers,
        'userProgress.lastActivity': serverTimestamp()
      })
      
      setShowQuizResults(true)
    } catch (error) {
      console.error('Error saving quiz results:', error)
    }
  }

  const getSessionProgress = (session) => {
    if (!session.userProgress) return 0
    const progress = session.userProgress
    let totalScore = 0
    let maxScore = 3

    if (progress.timeSpent > 0) totalScore += 1
    if (progress.completed) totalScore += 1
    if (progress.quizScore > 70) totalScore += 1

    return Math.round((totalScore / maxScore) * 100)
  }

  // Navigation for quiz questions
  const nextQuestion = () => {
    if (activeSession?.aiContent?.quiz && currentQuestion < activeSession.aiContent.quiz.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
    }
  }

  const prevQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1)
    }
  }

  // Mock AI content for demonstration
  const mockAIContent = {
    title: "Introduction to React Hooks",
    topics: ["useState", "useEffect", "Custom Hooks"],
    content: `## Understanding React Hooks

React Hooks are functions that let you use state and other React features without writing a class.

### useState Hook
The useState hook allows you to add state to functional components. It returns the current state and a function to update it.

### useState Hook
The useState hook allows you to add state to functional components. It returns the current state and a function to update it.

### useState Hook
The useState hook allows you to add state to functional components. It returns the current state and a function to update it.

### useState Hook
The useState hook allows you to add state to functional components. It returns the current state and a function to update it.
### useState Hook
The useState hook allows you to add state to functional components. It returns the current state and a function to update it.
### useState Hook
The useState hook allows you to add state to functional components. It returns the current state and a function to update it.

### useEffect Hook
The useEffect hook lets you perform side effects in functional components, like fetching data or updating the DOM.

### Best Practices
- Only call Hooks at the top level
- Only call Hooks from React functions
- Use multiple state variables when needed`,
    
    learningObjectives: [
      "Understand the purpose of React Hooks",
      "Master useState for state management",
      "Implement useEffect for side effects",
      "Create custom hooks for reusable logic"
    ],
    
    keyPoints: [
      "Hooks provide stateful logic to functional components",
      "useState manages component state",
      "useEffect handles side effects and lifecycle",
      "Custom hooks enable logic reuse"
    ],
    
    quiz: [
      {
        id: "q1",
        question: "Which hook is used for managing state in functional components?",
        options: ["useState", "useEffect", "useContext", "useReducer"],
        correctAnswer: 0,
        explanation: "useState is specifically designed for state management in functional components.",
        difficulty: "easy"
      },
      {
        id: "q2",
        question: "When does useEffect run by default?",
        options: [
          "After every render",
          "Only on mount",
          "Only when dependencies change",
          "Never automatically"
        ],
        correctAnswer: 0,
        explanation: "useEffect runs after every render unless you specify a dependency array.",
        difficulty: "medium"
      },
      {
        id: "q3",
        question: "What is the main advantage of using hooks?",
        options: [
          "They allow state in functional components",
          "They make components faster",
          "They reduce bundle size",
          "They improve SEO"
        ],
        correctAnswer: 0,
        explanation: "Hooks allow functional components to have state and lifecycle features.",
        difficulty: "easy"
      }
    ]
  }

  const upcomingSessions = sessions.filter(s => !s.completed && s.id !== activeSession?.id)
  const completedSessions = sessions.filter(s => s.completed)
  const sessionAIContent = activeSession?.aiContent || mockAIContent
  const currentQuizQuestion = sessionAIContent.quiz?.[currentQuestion]

  // Full-screen Modal Content
  const renderModalContent = () => {
    if (modalMode === 'content') {
      return (
        <div className="modal-content-container">
          {/* Modal Header */}
          <div className="modal-header">
            <div className="modal-header-left">
              <button 
                onClick={closeSessionModal}
                className="modal-close-btn"
              >
                <X size={24} />
              </button>
              <div className="session-info-modal">
                <h2>{activeSession.title || sessionAIContent.title}</h2>
                {activeSession.topic && (
                  <span className="session-topic-modal">{activeSession.topic}</span>
                )}
              </div>
            </div>
            
            <div className="modal-header-right">
              {/* Timer */}
              <div className="modal-timer">
                <Clock size={20} />
                <span className="timer-text-modal">{formatTime(timer)}</span>
              </div>
              
              {/* Timer Controls */}
              <div className="modal-timer-controls">
                {isRunning ? (
                  <button onClick={pauseSession} className="modal-control-btn">
                    <Pause size={16} />
                  </button>
                ) : (
                  <button onClick={resumeSession} className="modal-control-btn">
                    <Play size={16} />
                  </button>
                )}
                <button onClick={stopSession} className="modal-control-btn">
                  <Square size={16} />
                </button>
              </div>
              
              {/* Fullscreen Toggle */}
              <button onClick={toggleFullscreen} className="modal-control-btn">
                {fullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
              
              {/* Complete Button */}
              <button 
                onClick={() => completeSession(activeSession.id)}
                className="complete-btn-modal"
              >
                <CheckCircle size={16} />
                Complete Session
              </button>
            </div>
          </div>

          {/* Modal Body */}
          <div className="modal-body">
            <div className="modal-content-grid">
              {/* Left Side - Content */}
              <div className="modal-main-content">
          
                {/* Study Content */}
                <div className="modal-section">
                  <div className="modal-section-header">
                    <BookOpen size={20} />
                    <h3>Study Material</h3>
                  </div>
                  <div className="modal-section-content">
                    {/* Topics */}
                    <div className="topics-container-modal">
                      <h4>Topics Covered</h4>
                      <div className="topics-list-modal">
                        {sessionAIContent.topics?.map((topic, index) => (
                          <span key={index} className="topic-tag-modal">
                            {topic}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="content-text-modal">
                      <h4>Detailed Explanation</h4>
                      <div className="content-body-modal">
                        {sessionAIContent.content}
                      </div>
                    </div>

                    {/* Key Points */}
                    <div className="key-points-modal">
                      <h4>Key Takeaways</h4>
                      <ul>
                        {sessionAIContent.keyPoints?.map((point, index) => (
                          <li key={index} className="key-point-item">
                            <Star size={14} />
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                 {/* Learning Objectives */}
                <div className="modal-section">
                  <div className="modal-section-header">
                    <Target size={20} />
                    <h3>Learning Objectives</h3>
                  </div>
                  <div className="modal-section-content">
                    <ul className="objectives-list-modal">
                      {sessionAIContent.learningObjectives?.map((objective, index) => (
                        <li key={index} className="objective-item-modal">
                          <CheckCircle size={16} className="check-icon" />
                          <span>{objective}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>


                {/* Notes Section */}
                <div className="modal-section">
                  <div className="modal-section-header">
                    <FileText size={20} />
                    <h3>My Notes</h3>
                    <button 
                      onClick={() => startEditingNotes(activeSession)}
                      className="edit-notes-btn"
                    >
                      <Edit3 size={14} />
                      Edit
                    </button>
                  </div>
                  <div className="modal-section-content">
                    {editingNotes === activeSession.id ? (
                      <div className="notes-editor-modal">
                        <textarea
                          value={notesContent}
                          onChange={(e) => setNotesContent(e.target.value)}
                          placeholder="Write your notes here..."
                          rows={4}
                          className="notes-textarea-modal"
                        />
                        <div className="editor-actions-modal">
                          <button 
                            onClick={() => saveNotes(activeSession.id)}
                            className="save-notes-btn"
                          >
                            <Save size={16} />
                            Save
                          </button>
                          <button 
                            onClick={() => setEditingNotes(null)}
                            className="cancel-notes-btn"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="notes-display-modal">
                        {activeSession.notes ? (
                          <div className="notes-text-modal">
                            {activeSession.notes}
                          </div>
                        ) : (
                          <div className="empty-notes-modal">
                            <FileText size={24} />
                            <p>No notes yet. Click "Edit" to add your thoughts.</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Side - Progress & Tools */}
              <div className="modal-sidebar">
                {/* Progress */}
                <div className="progress-card-modal">
                  <div className="progress-header">
                    <BarChart3 size={20} />
                    <h4>Session Progress</h4>
                  </div>
                  <div className="progress-content">
                    <div className="time-progress">
                      <span>Time Spent:</span>
                      <strong>{formatTime(timer)}</strong>
                    </div>
                    <div className="progress-bar-modal">
                      <div 
                        className="progress-fill-modal"
                        style={{ width: `${(timer / (activeSession?.duration || 25 * 60)) * 100}%` }}
                      />
                    </div>
                    <div className="completion-status">
                      {sessionCompleted ? (
                        <span className="completed-badge-modal">
                          <CheckCircle size={14} />
                          Session Completed
                        </span>
                      ) : (
                        <span className="in-progress-badge">
                          <Clock size={14} />
                          In Progress
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="actions-card-modal">
                  <div className="actions-header">
                    <Zap size={20} />
                    <h4>Quick Actions</h4>
                  </div>
                  <div className="actions-list">
                    <button className="action-btn-modal">
                      <Volume2 size={16} />
                      Read Aloud
                    </button>
                    <button className="action-btn-modal">
                      <Download size={16} />
                      Save Notes
                    </button>
                    <button className="action-btn-modal">
                      <Share2 size={16} />
                      Share Session
                    </button>
                    <button 
                      onClick={() => setModalMode('quiz')}
                      className="action-btn-modal quiz-preview-btn"
                    >
                      <HelpCircle size={16} />
                      Preview Quiz ({sessionAIContent.quiz?.length || 0})
                    </button>
                  </div>
                </div>

                {/* AI Insights */}
                <div className="insights-card-modal">
                  <div className="insights-header">
                    <Brain size={20} />
                    <h4>AI Insights</h4>
                  </div>
                  <div className="insights-content">
                    <div className="insight-item-modal">
                      <Sparkles size={14} />
                      <div>
                        <h5>Personalized Content</h5>
                        <p>This content was tailored to your learning style</p>
                      </div>
                    </div>
                    <div className="insight-item-modal">
                      <TargetIcon size={14} />
                      <div>
                        <h5>Focus Areas</h5>
                        <p>Pay extra attention to useState and useEffect hooks</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    } else {
      // Quiz Mode
      return (
        <div className="modal-content-container quiz-mode">
          <div className="modal-header quiz-header">
            <div className="modal-header-left">
              <button 
                onClick={() => setModalMode('content')}
                className="modal-close-btn"
              >
                <ArrowLeft size={24} />
              </button>
              <div className="session-info-modal">
                <h2>Session Quiz</h2>
                <span className="session-topic-modal">Test Your Knowledge</span>
              </div>
            </div>
            
            <div className="modal-header-right">
              <div className="quiz-progress">
                <span>Question {currentQuestion + 1} of {sessionAIContent.quiz?.length || 0}</span>
              </div>
              {showQuizResults && (
                <div className="quiz-score-display">
                  <Award size={20} />
                  <span className="score-text">
                    Score: {activeSession?.userProgress?.quizScore || 0}%
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="modal-body quiz-body">
            {!showQuizResults ? (
              <div className="quiz-interface-modal">
                {currentQuizQuestion && (
                  <>
                    <div className="question-header">
                      <div className="question-meta">
                        <span className="question-number">Q{currentQuestion + 1}</span>
                        <span className="question-difficulty">
                          {currentQuizQuestion.difficulty}
                        </span>
                      </div>
                      <h3 className="question-text-modal">
                        {currentQuizQuestion.question}
                      </h3>
                    </div>

                    <div className="options-grid-modal">
                      {currentQuizQuestion.options.map((option, optIndex) => (
                        <button
                          key={optIndex}
                          className={`option-btn-modal ${
                            quizAnswers[currentQuizQuestion.id] === optIndex ? 'selected' : ''
                          }`}
                          onClick={() => handleQuizAnswer(currentQuizQuestion.id, optIndex)}
                        >
                          <span className="option-letter">
                            {String.fromCharCode(65 + optIndex)}
                          </span>
                          <span className="option-text">{option}</span>
                        </button>
                      ))}
                    </div>

                    <div className="quiz-navigation">
                      <button
                        onClick={prevQuestion}
                        disabled={currentQuestion === 0}
                        className="nav-btn-modal"
                      >
                        <ArrowLeft size={16} />
                        Previous
                      </button>
                      
                      <div className="question-dots">
                        {sessionAIContent.quiz?.map((_, index) => (
                          <button
                            key={index}
                            className={`question-dot ${currentQuestion === index ? 'active' : ''} ${
                              quizAnswers[sessionAIContent.quiz[index].id] !== undefined ? 'answered' : ''
                            }`}
                            onClick={() => setCurrentQuestion(index)}
                          />
                        ))}
                      </div>
                      
                      {currentQuestion === sessionAIContent.quiz?.length - 1 ? (
                        <button
                          onClick={submitQuiz}
                          className="nav-btn-modal primary"
                        >
                          Submit Quiz
                          <ArrowRight size={16} />
                        </button>
                      ) : (
                        <button
                          onClick={nextQuestion}
                          className="nav-btn-modal"
                        >
                          Next
                          <ArrowRight size={16} />
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="quiz-results-modal">
                <div className="results-header-modal">
                  <div className="results-icon-container">
                    <Award size={48} />
                  </div>
                  <h2>Quiz Completed!</h2>
                  <p className="results-subtitle">
                    You scored {activeSession?.userProgress?.quizScore || 0}% on this quiz
                  </p>
                </div>

                <div className="results-details">
                  {sessionAIContent.quiz?.map((question, index) => {
                    const userAnswer = quizAnswers[question.id]
                    const isCorrect = userAnswer === question.correctAnswer
                    
                    return (
                      <div key={question.id} className="result-item">
                        <div className={`result-status ${isCorrect ? 'correct' : 'incorrect'}`}>
                          {isCorrect ? (
                            <CheckCircle size={20} />
                          ) : (
                            <Lightbulb size={20} />
                          )}
                        </div>
                        <div className="result-content">
                          <h4>Question {index + 1}</h4>
                          <p className="result-question">{question.question}</p>
                          <p className="result-explanation">
                            <strong>Explanation:</strong> {question.explanation}
                          </p>
                          {!isCorrect && (
                            <p className="correct-answer">
                              <strong>Correct Answer:</strong> {question.options[question.correctAnswer]}
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="results-actions">
                  <button 
                    onClick={closeSessionModal}
                    className="results-btn primary"
                  >
                    <CheckCircle size={16} />
                    Finish Session
                  </button>
                  <button 
                    onClick={() => {
                      setShowQuizResults(false)
                      setQuizAnswers({})
                      setCurrentQuestion(0)
                    }}
                    className="results-btn"
                  >
                    <RefreshCw size={16} />
                    Retake Quiz
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )
    }
  }

  // Confetti effect (simplified)
  const renderConfetti = () => {
    if (!showConfetti) return null
    
    return (
      <div className="confetti-overlay">
        <div className="confetti-container">
          {[...Array(50)].map((_, i) => (
            <div 
              key={i}
              className="confetti"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                backgroundColor: `hsl(${Math.random() * 360}, 100%, 60%)`
              }}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="daily-session-page">
      {/* Full-screen Modal */}
      <AnimatePresence>
        {showSessionModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="session-modal-overlay"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="session-modal"
            >
              {renderModalContent()}
              {renderConfetti()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Page Content */}
      <div className="page-header">
        <div className="header-content">
          <div>
            <h1>Today's Study Sessions</h1>
            <p>Manage your learning sessions for {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          </div>
          <button 
            onClick={() => setShowNewSessionForm(true)}
            className="btn-primary"
          >
            <Plus size={20} />
            Add Session
          </button>
        </div>
      </div>

      <div className="session-layout">
        {/* Main Content - Active Session */}
        <div className="main-content">
          {activeSession && showSessionModal ? (
            <div className="active-session-placeholder">
              <div className="placeholder-content">
                <Maximize2 size={48} />
                <h3>Session in Progress</h3>
                <p>Your session is open in full-screen mode</p>
                <button 
                  onClick={() => setShowSessionModal(true)}
                  className="btn-primary"
                >
                  Return to Session
                </button>
              </div>
            </div>
          ) : (
            <div className="no-active-session">
              <div className="empty-state">
                <Clock size={64} className="empty-icon" />
                <h2>No Active Session</h2>
                <p>Select a session from the list to start learning</p>
                <div className="session-stats">
                  <div className="stat-cardD">
                    <Calendar size={20} />
                    <div className="stat-info">
                      <span className="stat-number">{sessions.length}</span>
                      <span className="stat-label">Total Sessions</span>
                    </div>
                  </div>
                  <div className="stat-cardD">
                    <CheckCircle size={20} />
                    <div className="stat-info">
                      <span className="stat-number">{completedSessions.length}</span>
                      <span className="stat-label">Completed</span>
                    </div>
                  </div>
                  <div className="stat-cardD">
                    <Play size={20} />
                    <div className="stat-info">
                      <span className="stat-number">{upcomingSessions.length}</span>
                      <span className="stat-label">Ready to Start</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar - Session List (remains the same as your original) */}
        <div className="sidebarDS">
          {/* New Session Form */}
          {showNewSessionForm && (
            <div className="sidebar-card new-session-form">
              <h3>Create New Session</h3>
              <form onSubmit={addNewSession}>
                <div className="form-group">
                  <label>Session Title *</label>
                  <input
                    type="text"
                    placeholder="e.g., React Hooks Practice"
                    value={newSession.title}
                    onChange={(e) => setNewSession({...newSession, title: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Topic (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g., JavaScript, Calculus"
                    value={newSession.topic}
                    onChange={(e) => setNewSession({...newSession, topic: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Notes (Optional)</label>
                  <textarea
                    placeholder="Any specific goals or context..."
                    value={newSession.notes}
                    onChange={(e) => setNewSession({...newSession, notes: e.target.value})}
                    rows={3}
                  />
                </div>
                <div className="form-actions">
                  <button 
                    type="button" 
                    onClick={() => setShowNewSessionForm(false)}
                    className="btn-outline"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Create Session
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Sessions List */}
          <div className="sidebar-card ">
            <div className="card-header">
              <h3>Today's Sessions</h3>
              <span className="badge">{sessions.length}</span>
            </div>

            {/* Tab Navigation */}
            <div className="tabs">
              <button 
                className={`tab ${activeTab === 'upcoming' ? 'active' : ''}`}
                onClick={() => setActiveTab('upcoming')}
              >
                Upcoming ({upcomingSessions.length})
              </button>
              <button 
                className={`tab ${activeTab === 'completed' ? 'active' : ''}`}
                onClick={() => setActiveTab('completed')}
              >
                Completed ({completedSessions.length})
              </button>
            </div>

            <div className="sessions-container">
              {activeTab === 'upcoming' ? (
                upcomingSessions.length > 0 ? (
                  upcomingSessions.map(session => (
                    <div 
                      key={session.id} 
                      className="session-item"
                      onClick={() => startSession(session)}
                    >
                      <div className="session-main">
                        <div className="session-icon">
                          <Play size={16} />
                        </div>
                        <div className="session-details">
                          <h4 className="session-title">{session.title}</h4>
                          {session.topic && (
                            <p className="session-meta">{session.topic}</p>
                          )}
                          <div className="session-info">
                            <span className="duration">{session.duration || 25} min</span>
                            {session.aiContent && (
                              <span className="ai-indicator">
                                <Sparkles size={12} />
                                AI Content
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="session-actions">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation()
                            startSession(session)
                          }}
                          className="btn-primary small"
                          disabled={!!activeSession && showSessionModal}
                          title="Start Session"
                        >
                          Start
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteSession(session.id)
                          }}
                          className="btn-outline small delete-btn"
                          title="Delete Session"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-list">
                    <BookOpen size={32} />
                    <p>No upcoming sessions</p>
                    <button 
                      onClick={() => setShowNewSessionForm(true)}
                      className="btn-outline small"
                    >
                      Add Session
                    </button>
                  </div>
                )
              ) : (
                completedSessions.length > 0 ? (
                  completedSessions.map(session => (
                    <div key={session.id} className="session-item completed">
                      <div className="session-main">
                        <div className="session-icon">
                          <CheckCircle size={16} />
                        </div>
                        <div className="session-details">
                          <h4 className="session-title">{session.title}</h4>
                          <div className="progress-info">
                            <div className="progress-bar">
                              <div 
                                className="progress-fill"
                                style={{ width: `${getSessionProgress(session)}%` }}
                              />
                            </div>
                            <span className="progress-text">{getSessionProgress(session)}% complete</span>
                          </div>
                          {session.userProgress?.quizScore && (
                            <div className="quiz-result">
                              Quiz: {session.userProgress.quizScore}%
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-list">
                    <CheckCircle size={32} />
                    <p>No completed sessions yet</p>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DailySession