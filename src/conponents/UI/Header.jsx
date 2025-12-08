import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, Search, User, Bell, LogOut, ChevronDown } from 'lucide-react'

const Header = ({ sidebarOpen, setSidebarOpen, unreadCount, setActiveTab, user, onLogout }) => {
  const [showUserMenu, setShowUserMenu] = useState(false)

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
    setShowUserMenu(false)
  }

  return (
    <header className="header">
      <div className="header-content">
        
        <div className="flex items-center" style={{ gap: '1rem' }}>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="mobile-menu-button"
          >
            <Menu size={20} color="#475569" />
          </button>
          
          <div className="search-container">
            <Search size={16} color="#94a3b8" className="search-icon" />
            <input
              type="text"
              placeholder="Search materials, sessions..."
              className="search-input"
            />
          </div>
        </div>

        <div className="flex items-center" style={{ gap: '1rem' }}>
          {/* Notifications Bell with Badge */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveTab('notifications')}
            className="notification-button"
          >
            <Bell size={20} color="#475569" />
            {unreadCount > 0 && (
              <span className="notification-dot">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </motion.button>
          
          {/* User Avatar with Dropdown */}
          <div className="user-menu-container">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="user-menu-button"
            >
              <div className="user-avatar">
                {user.photoURL ? (
                  <img 
                    src={user.photoURL} 
                    alt={getUserName(user)}
                    className="user-avatar-image"
                  />
                ) : (
                  <span className="user-avatar-initials">
                    {getUserInitials(user)}
                  </span>
                )}
              </div>
              
              
            </motion.button>

            <AnimatePresence>
              {showUserMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="user-dropdown"
                >
                  <div className="user-info">
                    <div className="user-avatar-small">
                      {user.photoURL ? (
                        <img 
                          src={user.photoURL} 
                          alt={getUserName(user)}
                          className="user-avatar-image"
                        />
                      ) : (
                        <span className="user-avatar-initials-small">
                          {getUserInitials(user)}
                        </span>
                      )}
                    </div>
                    <div className="user-details">
                      <div className="user-name">{getUserName(user)}</div>
                      <div className="user-email">{user.email}</div>
                    </div>
                  </div>
                
                  <div className="dropdown-divider"></div>
                  
                  <button
                    onClick={handleLogout}
                    className="logout-button"
                  >
                    <LogOut size={16} />
                    Sign Out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        </div>
      
    
    </header>
  )
}

export default Header