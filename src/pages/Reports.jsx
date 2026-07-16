import { useState, useEffect } from 'react'
import { BarChart3, TrendingUp, Calendar, Clock, MapPin, Users, Wallet } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'
import Card, { CardContent } from '../components/ui/Card'
import Select from '../components/ui/Select'
import { Skeleton } from '../components/ui/Skeleton'
import { getRevenueStats, getPopularTurfs, getPeakHours, getOccupancyRate } from '../services/reportService'
import { formatCurrency, cn } from '../utils/helpers'
import { useTheme } from '../context/ThemeContext'

const PERIODS = [
  { value: '7', label: 'Last 7 Days' },
  { value: '30', label: 'Last 30 Days' },
  { value: '90', label: 'Last 90 Days' },
]

const PIE_COLORS = ['#2a9d4e', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4']

export default function Reports() {
  const { isDark } = useTheme()
  const [period, setPeriod] = useState('30')
  const [loading, setLoading] = useState(true)
  const [revenue, setRevenue] = useState(null)
  const [popularTurfs, setPopularTurfs] = useState([])
  const [peakHours, setPeakHours] = useState([])
  const [occupancy, setOccupancy] = useState({ rate: 0 })

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true)
      const days = parseInt(period)
      const end = new Date().toISOString().split('T')[0]
      const start = new Date(Date.now() - days * 86400000).toISOString().split('T')[0]
      const [revRes, popRes, peakRes, occRes] = await Promise.all([
        getRevenueStats(start, end),
        getPopularTurfs(start, end),
        getPeakHours(start, end),
        getOccupancyRate(start, end),
      ])
      setRevenue(revRes.data)
      setPopularTurfs(popRes.data || [])
      setPeakHours(peakRes.data || [])
      setOccupancy(occRes)
      setLoading(false)
    }
    fetchReports()
  }, [period])

  const textColor = isDark ? '#9ca3af' : '#6b7280'
  const gridColor = isDark ? '#374151' : '#f3f4f6'

  const statCards = [
    { label: 'Total Revenue', value: formatCurrency(revenue?.totalRevenue || 0), icon: Wallet, gradient: 'from-emerald-500 to-teal-600' },
    { label: 'Paid Revenue', value: formatCurrency(revenue?.paidRevenue || 0), icon: TrendingUp, gradient: 'from-blue-500 to-indigo-600' },
    { label: 'Total Bookings', value: revenue?.totalBookings || 0, icon: Calendar, gradient: 'from-purple-500 to-violet-600' },
    { label: 'Occupancy Rate', value: `${occupancy.rate}%`, icon: BarChart3, gradient: 'from-amber-500 to-orange-600' },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Reports & Analytics</h1>
        <Select options={PERIODS} value={period} onChange={e => setPeriod(e.target.value)} className="w-44" />
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((c, i) => (
          <div key={i} className="stat-card">
            <div className="flex items-start justify-between">
              <div><p className="text-sm font-medium text-gray-500">{c.label}</p><p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{loading ? '...' : c.value}</p></div>
              <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br', c.gradient)}><c.icon className="w-6 h-6 text-white" /></div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card hover={false}>
          <CardContent>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Revenue Trend</h3>
            {loading ? <Skeleton className="h-64 w-full" /> : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={revenue?.chartData || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: textColor }} tickFormatter={d => d?.slice(5)} />
                  <YAxis tick={{ fontSize: 11, fill: textColor }} tickFormatter={v => `₹${v/1000}k`} />
                  <Tooltip contentStyle={{ backgroundColor: isDark ? '#1a1b1e' : '#fff', border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`, borderRadius: 12 }} formatter={v => [formatCurrency(v), 'Revenue']} />
                  <Line type="monotone" dataKey="revenue" stroke="#2a9d4e" strokeWidth={2.5} dot={{ fill: '#2a9d4e', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Peak Hours */}
        <Card hover={false}>
          <CardContent>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Peak Booking Hours</h3>
            {loading ? <Skeleton className="h-64 w-full" /> : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={peakHours}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis dataKey="hour" tick={{ fontSize: 11, fill: textColor }} />
                  <YAxis tick={{ fontSize: 11, fill: textColor }} />
                  <Tooltip contentStyle={{ backgroundColor: isDark ? '#1a1b1e' : '#fff', border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`, borderRadius: 12 }} />
                  <Bar dataKey="bookings" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Popular Turfs */}
        <Card hover={false}>
          <CardContent>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Popular Turfs</h3>
            {loading ? <Skeleton className="h-64 w-full" /> : popularTurfs.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-12">No data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={popularTurfs} dataKey="bookings" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({name, percent}) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                    {popularTurfs.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Occupancy Gauge */}
        <Card hover={false}>
          <CardContent>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Occupancy Rate</h3>
            <div className="flex items-center justify-center py-8">
              <div className="relative w-40 h-40">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="50" fill="none" stroke={isDark ? '#374151' : '#f3f4f6'} strokeWidth="10" />
                  <circle cx="60" cy="60" r="50" fill="none" stroke="#2a9d4e" strokeWidth="10" strokeDasharray={`${(occupancy.rate / 100) * 314} 314`} strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                  <span className="text-3xl font-bold text-gray-900 dark:text-white">{loading ? '...' : occupancy.rate}%</span>
                  <span className="text-xs text-gray-400">Occupied</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
