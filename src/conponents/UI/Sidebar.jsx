import React from 'react'
import { motion } from 'framer-motion'
import { 
  Home, 
  Upload, 
  Play, 
  BookOpen, 
  Calendar, 
  Bell,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  User
} from 'lucide-react'

const Sidebar = ({ 
  activeTab, 
  setActiveTab, 
  sidebarOpen, 
  setSidebarOpen, 
  unreadCount, 
  user, 
  onLogout 
}) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'upload', label: 'Upload Material', icon: Upload },
    { id: 'dailysession', label: 'Daily Session', icon: Play },
    { id: 'learningpath', label: 'Learning Path', icon: BookOpen },
    { id: 'schedule', label: 'Study Schedule', icon: Calendar },
    { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadCount },
  ]

  const getUserInitials = (user) => {
    if (user.displayName) {
      return user.displayName.split(' ').map(n => n[0]).join('').toUpperCase()
    }
    return user.email ? user.email[0].toUpperCase() : 'U'
  }

  const getUserName = (user) => {
    return user.displayName || user.email || 'User'
  }

  const handleLogout = () => {
    onLogout()
  }

  return (
    <>
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="mobile-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <motion.div
        initial={false}
        animate={{ 
          width: sidebarOpen ? 280 : 80,
          x: window.innerWidth >= 1024 ? 0 : (sidebarOpen ? 0 : -280)
        }}
        className="sidebar"
        style={{
          position: window.innerWidth >= 1024 ? 'relative' : 'fixed',
          left: 0,
          top: 0
        }}
      >
        {/* Header */}
        <div className="sidebar-header">
          <div className="flex items-center justify-between">
            <motion.div
              initial={false}
              animate={{ opacity: sidebarOpen ? 1 : 0 }}
              className="flex items-center"
              style={{ gap: '0.75rem', minWidth: sidebarOpen ? 'auto' : '2.5rem' }}
            >
              <div className="logo-icon">
                <BookOpen size={24} color="#2563eb" />
              </div>
              <motion.h1 
                initial={false}
                animate={{ 
                  opacity: sidebarOpen ? 1 : 0,
                  display: sidebarOpen ? 'block' : 'none'
                }}
                className="text-white font-bold text-xl"
                style={{ whiteSpace: 'nowrap' }}
              >
                EasyLearn 
              </motion.h1>
            </motion.div>
            
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="sidebar-toggle"
            >
              {sidebarOpen ? (
                <ChevronLeft size={16} color="#ffffff" />
              ) : (
                <ChevronRight size={16} color="#ffffff" />
              )}
            </button>
          </div>
        </div>

        {/* User Info Section */}
        {user && (
          <motion.div
            initial={false}
            animate={{ 
              opacity: sidebarOpen ? 1 : 0,
              height: sidebarOpen ? 'auto' : 0
            }}
            className="user-section"
          >
            <div className="user-info-sidebar">
              <div className="user-avatar-sidebar">
                {user.photoURL ? (
                  <img 
                    src={user.photoURL} 
                    alt={getUserName(user)}
                    className="user-avatar-image-sidebar"
                  />
                ) : (
                  <span className="user-avatar-initials-sidebar">
                    {getUserInitials(user)}
                  </span>
                )}
              </div>
              <div className="user-details-sidebar">
                <div className="user-name-sidebar">{getUserName(user)}</div>
                <div className="user-email-sidebar">{user.email}</div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Navigation */}
        <nav className="sidebar-nav">
          {menuItems.map((item) => {
            const Icon = item.icon
            return (
              <motion.button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id)
                  if (window.innerWidth < 1024) {
                    setSidebarOpen(false)
                  }
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`nav-button ${activeTab === item.id ? 'active' : ''}`}
              >
                <div className="icon-container">
                  <Icon size={20} />
                  {item.badge > 0 && (
                    <span className="notification-badge">
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                  )}
                </div>
                <motion.span
                  initial={false}
                  animate={{ 
                    opacity: sidebarOpen ? 1 : 0,
                    display: sidebarOpen ? 'inline' : 'none'
                  }}
                  style={{ 
                    marginLeft: '0.75rem', 
                    whiteSpace: 'nowrap',
                    overflow: 'hidden'
                  }}
                >
                  {item.label}
                </motion.span>
              </motion.button>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <motion.button
            initial={false}
            animate={{ 
              opacity: sidebarOpen ? 1 : 0,
              display: sidebarOpen ? 'flex' : 'none'
            }}
            whileHover={{ scale: 1.02 }}
            className="nav-button"
            style={{ 
              color: 'rgba(255, 255, 255, 0.8)',
              justifyContent: 'flex-start'
            }}
          >
            <Settings size={20} />
            <span style={{ marginLeft: '0.75rem' }}>Settings</span>
          </motion.button>

          {/* Logout Button */}
          {user && (
            <motion.button
              onClick={handleLogout}
              initial={false}
              animate={{ 
                opacity: sidebarOpen ? 1 : 0,
                display: sidebarOpen ? 'flex' : 'none'
              }}
              whileHover={{ scale: 1.02 }}
              className="nav-button logout-button-sidebar"
              style={{ 
                justifyContent: 'flex-start',
                color: 'rgba(255, 255, 255, 0.8)'
              }}
            >
              <LogOut size={20} />
              <span style={{ marginLeft: '0.75rem' }}>Sign Out</span>
            </motion.button>
          )}

          {/* Compact User Info when sidebar is collapsed */}
          {user && !sidebarOpen && (
            <motion.div
              initial={false}
              className="user-compact"
            >
              <div className="user-avatar-compact">
                {user.photoURL ? (
                  <img 
                    src={user.photoURL} 
                    alt={getUserName(user)}
                    className="user-avatar-image-compact"
                  />
                ) : (
                  <span className="user-avatar-initials-compact">
                    {getUserInitials(user)}
                  </span>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </>
  )
}

export default Sidebar