import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Calendar,
  BookOpen,
  MapPin,
  Users,
  BarChart3,
  Bell,
  Settings,
  LogOut,
  Trophy,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useNotifications } from '../../context/NotificationContext'
import { cn, getInitials, nameToColor } from '../../utils/helpers'

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/calendar', label: 'Calendar', icon: Calendar },
  { path: '/bookings', label: 'Bookings', icon: BookOpen },
  { path: '/turfs', label: 'Turfs', icon: MapPin },
  { path: '/customers', label: 'Customers', icon: Users },
  { path: '/reports', label: 'Reports', icon: BarChart3 },
  { path: '/notifications', label: 'Notifications', icon: Bell },
  { path: '/settings', label: 'Settings', icon: Settings },
]

export default function Sidebar({ collapsed, setCollapsed }) {
  const { profile, signOut } = useAuth()
  const { unreadCount } = useNotifications()
  const location = useLocation()

  return (
    <aside className={cn(
      'fixed left-0 top-0 h-screen bg-white dark:bg-dark-900 border-r border-gray-200 dark:border-dark-700 z-40 flex flex-col transition-all duration-300',
      collapsed ? 'w-[72px]' : 'w-64'
    )}>
      {/* Logo */}
      <div className={cn(
        'flex items-center h-16 px-4 border-b border-gray-100 dark:border-dark-700',
        collapsed ? 'justify-center' : 'gap-3'
      )}>
        <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0">
          <Trophy className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="animate-fade-in">
            <h1 className="text-base font-bold text-gray-900 dark:text-white tracking-tight">TurfManager</h1>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium tracking-wider uppercase">Booking System</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = item.path === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(item.path)

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                isActive ? 'sidebar-link-active' : 'sidebar-link',
                collapsed && 'justify-center px-0'
              )}
              title={collapsed ? item.label : undefined}
            >
              <div className="relative">
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {item.label === 'Notifications' && unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
              {!collapsed && <span className="animate-fade-in">{item.label}</span>}
            </NavLink>
          )
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="px-3 py-2">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 py-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-xl transition-all"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          {!collapsed && <span className="text-xs font-medium">Collapse</span>}
        </button>
      </div>

      {/* User Profile */}
      <div className={cn(
        'border-t border-gray-100 dark:border-dark-700 p-3',
        collapsed ? 'flex justify-center' : ''
      )}>
        <div className={cn(
          'flex items-center rounded-xl p-2 hover:bg-gray-50 dark:hover:bg-dark-800 transition-colors',
          collapsed ? 'justify-center' : 'gap-3'
        )}>
          <div className={cn(
            'w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0',
            nameToColor(profile?.full_name)
          )}>
            {getInitials(profile?.full_name || 'Owner')}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0 animate-fade-in">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {profile?.full_name || 'Turf Owner'}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                {profile?.email || 'owner@turf.com'}
              </p>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={signOut}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4 text-gray-400 hover:text-red-500" />
            </button>
          )}
        </div>
      </div>
    </aside>
  )
}
