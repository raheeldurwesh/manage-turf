import { useState, useRef, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import {
  Search,
  Bell,
  Moon,
  Sun,
  Menu,
  X,
  CheckCircle,
  Calendar as CalendarIcon,
  Wallet,
  MapPin,
  XCircle,
} from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
import { useNotifications } from '../../context/NotificationContext'
import { cn } from '../../utils/helpers'
import { format } from '../../utils/dateUtils'

const pageTitles = {
  '/': 'Dashboard',
  '/calendar': 'Calendar',
  '/bookings': 'Bookings',
  '/turfs': 'Turfs',
  '/customers': 'Customers',
  '/reports': 'Reports',
  '/notifications': 'Notifications',
  '/settings': 'Settings',
}

const notifIcons = {
  booking_created: { icon: CalendarIcon, color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/30' },
  booking_cancelled: { icon: XCircle, color: 'text-red-500 bg-red-50 dark:bg-red-900/30' },
  payment_received: { icon: Wallet, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/30' },
  booking_reminder: { icon: Bell, color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/30' },
  turf_updated: { icon: MapPin, color: 'text-purple-500 bg-purple-50 dark:bg-purple-900/30' },
  booking_updated: { icon: CheckCircle, color: 'text-cyan-500 bg-cyan-50 dark:bg-cyan-900/30' },
}

export default function Header({ onMenuToggle, showMenuButton }) {
  const location = useLocation()
  const { isDark, toggleTheme } = useTheme()
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications()
  const [showNotifDropdown, setShowNotifDropdown] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const dropdownRef = useRef(null)

  const pageTitle = pageTitles[location.pathname] || 'Dashboard'

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowNotifDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const recentNotifications = notifications.slice(0, 5)

  return (
    <header className="sticky top-0 z-30 glass border-b border-gray-200/50 dark:border-dark-700/50">
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        {/* Left */}
        <div className="flex items-center gap-4">
          {showMenuButton && (
            <button
              onClick={onMenuToggle}
              className="p-2 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-xl transition-colors lg:hidden"
            >
              <Menu className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          )}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{pageTitle}</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {format(new Date(), 'EEEE, dd MMM yyyy')}
            </p>
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="hidden md:block relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search bookings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64 pl-10 pr-4 py-2 bg-gray-50 dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all"
            />
          </div>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2.5 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-xl transition-all duration-200"
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDark ? (
              <Sun className="w-5 h-5 text-amber-400" />
            ) : (
              <Moon className="w-5 h-5 text-gray-600" />
            )}
          </button>

          {/* Notifications */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowNotifDropdown(!showNotifDropdown)}
              className="p-2.5 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-xl transition-all duration-200 relative"
            >
              <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-scale-in">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Dropdown */}
            {showNotifDropdown && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-dark-800 rounded-2xl shadow-xl border border-gray-200 dark:border-dark-700 animate-scale-in overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-dark-700">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Notifications</h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-xs text-primary-600 dark:text-primary-400 hover:underline font-medium"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto">
                  {recentNotifications.length === 0 ? (
                    <div className="py-8 text-center">
                      <Bell className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">No notifications yet</p>
                    </div>
                  ) : (
                    recentNotifications.map((notif) => {
                      const config = notifIcons[notif.type] || notifIcons.booking_created
                      const NotifIcon = config.icon
                      return (
                        <button
                          key={notif.id}
                          onClick={() => {
                            markAsRead(notif.id)
                            setShowNotifDropdown(false)
                          }}
                          className={cn(
                            'w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors text-left',
                            !notif.is_read && 'bg-primary-50/50 dark:bg-primary-900/10'
                          )}
                        >
                          <div className={cn('p-2 rounded-xl flex-shrink-0', config.color)}>
                            <NotifIcon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={cn(
                              'text-sm truncate',
                              notif.is_read
                                ? 'text-gray-600 dark:text-gray-400'
                                : 'text-gray-900 dark:text-white font-medium'
                            )}>
                              {notif.title}
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">
                              {notif.message}
                            </p>
                          </div>
                          {!notif.is_read && (
                            <div className="w-2 h-2 rounded-full bg-primary-500 mt-2 flex-shrink-0" />
                          )}
                        </button>
                      )
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
