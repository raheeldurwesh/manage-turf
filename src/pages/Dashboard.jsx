import { useState, useEffect } from 'react'
import {
  Calendar,
  Clock,
  Wallet,
  TrendingUp,
  MapPin,
  Users,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  CheckCircle,
  Phone,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Card, { CardContent } from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import { SkeletonStat } from '../components/ui/Skeleton'
import { formatCurrency, formatTime12h, getRelativeDateLabel, cn, getInitials, nameToColor } from '../utils/helpers'
import { getTodayBookings, getUpcomingBookings } from '../services/bookingService'
import { getTurfs } from '../services/turfService'
import { getTodayRevenue, getMonthlyRevenue } from '../services/reportService'
import { BOOKING_STATUS_COLORS } from '../utils/constants'
import { supabase } from '../services/supabase'
import { useToast } from '../context/ToastContext'

export default function Dashboard() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    todayBookings: [],
    upcomingBookings: [],
    turfs: [],
    todayRevenue: 0,
    monthlyRevenue: 0,
    totalBookings: 0,
    activeTurfs: 0,
  })

  const fetchDashboardData = async () => {
    try {
      const [todayRes, upcomingRes, turfsRes, todayRevRes, monthRevRes] = await Promise.all([
        getTodayBookings(),
        getUpcomingBookings(),
        getTurfs(),
        getTodayRevenue(),
        getMonthlyRevenue(),
      ])

      setStats({
        todayBookings: todayRes.data || [],
        upcomingBookings: upcomingRes.data || [],
        turfs: turfsRes.data || [],
        todayRevenue: todayRevRes.data?.totalRevenue || 0,
        monthlyRevenue: monthRevRes.data?.totalRevenue || 0,
        totalBookings: monthRevRes.data?.totalBookings || 0,
        activeTurfs: turfsRes.data?.filter(t => t.is_active).length || 0,
      })
    } catch (err) {
      console.error('Dashboard fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  // Realtime subscription for bookings
  useEffect(() => {
    const channel = supabase
      .channel('dashboard-bookings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, (payload) => {
        fetchDashboardData()
        if (payload.eventType === 'INSERT') {
          toast.success('New booking created!')
        } else if (payload.eventType === 'UPDATE') {
          toast.info('Booking updated')
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'turfs' }, () => {
        fetchDashboardData()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const statCards = [
    {
      label: "Today's Bookings",
      value: stats.todayBookings.length,
      icon: Calendar,
      gradient: 'from-blue-500 to-indigo-600',
      change: '+12%',
      trend: 'up',
    },
    {
      label: "Today's Revenue",
      value: formatCurrency(stats.todayRevenue),
      icon: Wallet,
      gradient: 'from-emerald-500 to-teal-600',
      change: '+8%',
      trend: 'up',
    },
    {
      label: 'Monthly Revenue',
      value: formatCurrency(stats.monthlyRevenue),
      icon: TrendingUp,
      gradient: 'from-purple-500 to-violet-600',
      change: '+15%',
      trend: 'up',
    },
    {
      label: 'Active Turfs',
      value: stats.activeTurfs,
      icon: MapPin,
      gradient: 'from-amber-500 to-orange-600',
      change: null,
      trend: null,
    },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonStat key={i} />)
        ) : (
          statCards.map((card, i) => (
            <div key={i} className="stat-card group" style={{ animationDelay: `${i * 50}ms` }}>
              {/* Background decoration */}
              <div className={cn(
                'absolute -top-4 -right-4 w-24 h-24 rounded-full opacity-10 bg-gradient-to-br',
                card.gradient
              )} />

              <div className="flex items-start justify-between relative">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{card.label}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{card.value}</p>
                  {card.change && (
                    <div className={cn(
                      'flex items-center gap-1 mt-2 text-xs font-medium',
                      card.trend === 'up' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                    )}>
                      {card.trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {card.change} vs last period
                    </div>
                  )}
                </div>
                <div className={cn(
                  'w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br shadow-lg',
                  card.gradient
                )}>
                  <card.icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Quick Actions */}
      <Card hover={false}>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Quick Actions</h3>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => navigate('/bookings?action=new')} icon={Plus} size="sm">
              New Booking
            </Button>
            <Button onClick={() => navigate('/calendar')} variant="secondary" icon={Calendar} size="sm">
              View Calendar
            </Button>
            <Button onClick={() => navigate('/turfs?action=new')} variant="secondary" icon={MapPin} size="sm">
              Add Turf
            </Button>
            <Button onClick={() => navigate('/reports')} variant="secondary" icon={TrendingUp} size="sm">
              View Reports
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Bookings */}
        <Card hover={false}>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Today's Bookings</h3>
              <button
                onClick={() => navigate('/bookings')}
                className="text-sm text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1 font-medium"
              >
                View All <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {stats.todayBookings.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No bookings today</p>
              </div>
            ) : (
              <div className="space-y-3">
                {stats.todayBookings.slice(0, 5).map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-dark-700/50 hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors cursor-pointer"
                    onClick={() => navigate(`/bookings`)}
                  >
                    <div className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold',
                      nameToColor(booking.customer_name)
                    )}>
                      {getInitials(booking.customer_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {booking.customer_name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {booking.turfs?.name} • {formatTime12h(booking.start_time)} - {formatTime12h(booking.end_time)}
                      </p>
                    </div>
                    <Badge color={BOOKING_STATUS_COLORS[booking.booking_status]}>
                      {booking.booking_status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Bookings */}
        <Card hover={false}>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Upcoming Bookings</h3>
              <button
                onClick={() => navigate('/bookings')}
                className="text-sm text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1 font-medium"
              >
                View All <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {stats.upcomingBookings.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No upcoming bookings</p>
              </div>
            ) : (
              <div className="space-y-3">
                {stats.upcomingBookings.slice(0, 5).map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-dark-700/50 hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors cursor-pointer"
                    onClick={() => navigate('/bookings')}
                  >
                    <div className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold',
                      nameToColor(booking.customer_name)
                    )}>
                      {getInitials(booking.customer_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {booking.customer_name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {getRelativeDateLabel(booking.booking_date)} • {formatTime12h(booking.start_time)} - {formatTime12h(booking.end_time)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(booking.total_amount)}
                      </p>
                      <p className="text-xs text-gray-400">{booking.turfs?.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
