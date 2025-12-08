import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Target, Calendar, BookOpen, Clock, Users, Star, ChevronRight, Check } from 'lucide-react'

const PlanSetup = () => {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState({
    goal: '',
    deadline: '',
    weeklyHours: '',
    subjects: [],
    difficulty: 'beginner',
    learningStyle: 'visual'
  })

  const goals = [
    { id: 'exam', label: 'Exam Preparation', icon: Target, description: 'Prepare for specific exams or tests' },
    { id: 'certification', label: 'Certification', icon: Star, description: 'Get certified in a specific field' },
    { id: 'skill', label: 'Skill Development', icon: BookOpen, description: 'Learn new skills or improve existing ones' },
    { id: 'career', label: 'Career Advancement', icon: Users, description: 'Advance your career prospects' }
  ]

  const subjects = [
    'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science',
    'History', 'Literature', 'Economics', 'Psychology', 'Languages'
  ]

  const learningStyles = [
    { id: 'visual', label: 'Visual', description: 'Learn through images, diagrams, and spatial understanding' },
    { id: 'auditory', label: 'Auditory', description: 'Learn through listening and sound' },
    { id: 'reading', label: 'Reading/Writing', description: 'Learn through reading and writing' },
    { id: 'kinesthetic', label: 'Kinesthetic', description: 'Learn through hands-on experience' }
  ]

  const handleSubjectToggle = (subject) => {
    setFormData(prev => ({
      ...prev,
      subjects: prev.subjects.includes(subject)
        ? prev.subjects.filter(s => s !== subject)
        : [...prev.subjects, subject]
    }))
  }

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = () => {
    console.log('Plan submitted:', formData)
    // Here you would typically send the data to your backend
    alert('Study plan created successfully!')
  }

  const steps = [
    { number: 1, title: 'Goal', description: 'Set your learning objective' },
    { number: 2, title: 'Subjects', description: 'Choose what to study' },
    { number: 3, title: 'Schedule', description: 'Plan your study time' },
    { number: 4, title: 'Style', description: 'Personalize learning approach' }
  ]

  return (
    <div className="plansetup-container">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card glass"
      >
        <div className="plansetup-header">
          <h1 className="plansetup-title">Create Your Study Plan</h1>
          <p className="plansetup-subtitle">
            Let's build a personalized learning path tailored to your goals and schedule
          </p>
        </div>

        {/* Progress Steps */}
        <div className="progress-steps">
          {steps.map((step, index) => (
            <div key={step.number} className="progress-step">
              <div className={`step-indicator ${currentStep >= step.number ? 'active' : ''} ${currentStep > step.number ? 'completed' : ''}`}>
                {currentStep > step.number ? <Check size={16} /> : step.number}
              </div>
              <div className="step-info">
                <span className="step-title">{step.title}</span>
                <span className="step-description">{step.description}</span>
              </div>
              {index < steps.length - 1 && (
                <div className={`step-connector ${currentStep > step.number ? 'active' : ''}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Goal Selection */}
        {currentStep === 1 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="step-content"
          >
            <h2 className="step-title">What's your main learning goal?</h2>
            <p className="step-description">Choose the primary objective for your study plan</p>
            
            <div className="goals-grid">
              {goals.map((goal) => (
                <motion.div
                  key={goal.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`goal-card ${formData.goal === goal.id ? 'selected' : ''}`}
                  onClick={() => setFormData(prev => ({ ...prev, goal: goal.id }))}
                >
                  <div className="goal-icon">
                    <goal.icon size={24} />
                  </div>
                  <h3 className="goal-name">{goal.label}</h3>
                  <p className="goal-description">{goal.description}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Step 2: Subject Selection */}
        {currentStep === 2 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="step-content"
          >
            <h2 className="step-title">What subjects do you want to study?</h2>
            <p className="step-description">Select all subjects relevant to your goals</p>
            
            <div className="subjects-grid">
              {subjects.map((subject) => (
                <motion.button
                  key={subject}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`subject-button ${formData.subjects.includes(subject) ? 'selected' : ''}`}
                  onClick={() => handleSubjectToggle(subject)}
                >
                  {subject}
                  {formData.subjects.includes(subject) && <Check size={16} />}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Step 3: Schedule Setup */}
        {currentStep === 3 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="step-content"
          >
            <h2 className="step-title">Set your study schedule</h2>
            <p className="step-description">Define your timeline and availability</p>
            
            <div className="schedule-form">
              <div className="form-group">
                <label className="form-label">
                  <Calendar size={18} />
                  Target Completion Date
                </label>
                <input
                  type="date"
                  className="form-input"
                  value={formData.deadline}
                  onChange={(e) => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">
                  <Clock size={18} />
                  Weekly Study Hours
                </label>
                <select
                  className="form-input"
                  value={formData.weeklyHours}
                  onChange={(e) => setFormData(prev => ({ ...prev, weeklyHours: e.target.value }))}
                >
                  <option value="">Select hours per week</option>
                  <option value="5">5 hours</option>
                  <option value="10">10 hours</option>
                  <option value="15">15 hours</option>
                  <option value="20">20 hours</option>
                  <option value="25">25+ hours</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">
                  <BookOpen size={18} />
                  Difficulty Level
                </label>
                <select
                  className="form-input"
                  value={formData.difficulty}
                  onChange={(e) => setFormData(prev => ({ ...prev, difficulty: e.target.value }))}
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 4: Learning Style */}
        {currentStep === 4 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="step-content"
          >
            <h2 className="step-title">Choose your learning style</h2>
            <p className="step-description">Help us personalize your study materials</p>
            
            <div className="learning-styles-grid">
              {learningStyles.map((style) => (
                <motion.div
                  key={style.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`learning-style-card ${formData.learningStyle === style.id ? 'selected' : ''}`}
                  onClick={() => setFormData(prev => ({ ...prev, learningStyle: style.id }))}
                >
                  <h3 className="style-name">{style.label}</h3>
                  <p className="style-description">{style.description}</p>
                </motion.div>
              ))}
            </div>

            {/* Plan Summary */}
            <div className="plan-summary">
              <h3 className="summary-title">Plan Summary</h3>
              <div className="summary-content">
                <div className="summary-item">
                  <span>Goal:</span>
                  <strong>{goals.find(g => g.id === formData.goal)?.label}</strong>
                </div>
                <div className="summary-item">
                  <span>Subjects:</span>
                  <strong>{formData.subjects.length} selected</strong>
                </div>
                <div className="summary-item">
                  <span>Weekly Hours:</span>
                  <strong>{formData.weeklyHours} hours</strong>
                </div>
                <div className="summary-item">
                  <span>Difficulty:</span>
                  <strong>{formData.difficulty}</strong>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Navigation Buttons */}
        <div className="step-navigation">
          <button
            onClick={handleBack}
            disabled={currentStep === 1}
            className="nav-button secondary"
          >
            Back
          </button>
          
          {currentStep < 4 ? (
            <button
              onClick={handleNext}
              disabled={
                (currentStep === 1 && !formData.goal) ||
                (currentStep === 2 && formData.subjects.length === 0) ||
                (currentStep === 3 && (!formData.deadline || !formData.weeklyHours))
              }
              className="nav-button primary"
            >
              Next
              <ChevronRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              className="nav-button success"
            >
              Create Study Plan
              <Check size={16} />
            </button>
          )}
        </div>
      </motion.div>
    </div>
  )
}

export default PlanSetup