import { supabase } from './supabase'

/**
 * Get revenue stats for a date range
 */
export const getRevenueStats = async (startDate, endDate) => {
  const { data, error } = await supabase
    .from('bookings')
    .select('total_amount, booking_date, payment_status, booking_status')
    .gte('booking_date', startDate)
    .lte('booking_date', endDate)
    .in('booking_status', ['confirmed', 'completed'])

  if (error) return { data: null, error }

  const totalRevenue = data.reduce((sum, b) => sum + (b.total_amount || 0), 0)
  const paidRevenue = data
    .filter(b => b.payment_status === 'paid')
    .reduce((sum, b) => sum + (b.total_amount || 0), 0)
  const pendingRevenue = totalRevenue - paidRevenue
  const totalBookings = data.length

  // Group by date for chart data
  const revenueByDate = {}
  data.forEach(b => {
    if (!revenueByDate[b.booking_date]) {
      revenueByDate[b.booking_date] = { date: b.booking_date, revenue: 0, bookings: 0 }
    }
    revenueByDate[b.booking_date].revenue += b.total_amount || 0
    revenueByDate[b.booking_date].bookings += 1
  })

  const chartData = Object.values(revenueByDate).sort((a, b) => a.date.localeCompare(b.date))

  return {
    data: { totalRevenue, paidRevenue, pendingRevenue, totalBookings, chartData },
    error: null,
  }
}

/**
 * Get today's revenue
 */
export const getTodayRevenue = async () => {
  const today = new Date().toISOString().split('T')[0]
  return getRevenueStats(today, today)
}

/**
 * Get this month's revenue
 */
export const getMonthlyRevenue = async () => {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
  return getRevenueStats(startOfMonth, endOfMonth)
}

/**
 * Get popular turfs
 */
export const getPopularTurfs = async (startDate, endDate) => {
  const { data, error } = await supabase
    .from('bookings')
    .select('turf_id, turfs(name)')
    .gte('booking_date', startDate)
    .lte('booking_date', endDate)
    .in('booking_status', ['confirmed', 'completed'])

  if (error) return { data: null, error }

  const turfCounts = {}
  data.forEach(b => {
    const name = b.turfs?.name || 'Unknown'
    if (!turfCounts[name]) turfCounts[name] = { name, bookings: 0 }
    turfCounts[name].bookings += 1
  })

  const sorted = Object.values(turfCounts).sort((a, b) => b.bookings - a.bookings)
  return { data: sorted, error: null }
}

/**
 * Get peak hours stats
 */
export const getPeakHours = async (startDate, endDate) => {
  const { data, error } = await supabase
    .from('bookings')
    .select('start_time')
    .gte('booking_date', startDate)
    .lte('booking_date', endDate)
    .in('booking_status', ['confirmed', 'completed'])

  if (error) return { data: null, error }

  const hourCounts = {}
  data.forEach(b => {
    const hour = parseInt(b.start_time?.split(':')[0] || '0')
    const label = hour > 12 ? `${hour - 12} PM` : hour === 12 ? '12 PM' : `${hour} AM`
    if (!hourCounts[label]) hourCounts[label] = { hour: label, bookings: 0, sortKey: hour }
    hourCounts[label].bookings += 1
  })

  const sorted = Object.values(hourCounts).sort((a, b) => a.sortKey - b.sortKey)
  return { data: sorted, error: null }
}

/**
 * Get occupancy rate
 */
export const getOccupancyRate = async (startDate, endDate) => {
  // Get total available hours across all turfs
  const { data: turfs } = await supabase
    .from('turfs')
    .select('opening_time, closing_time')
    .eq('is_active', true)

  const { data: bookings } = await supabase
    .from('bookings')
    .select('start_time, end_time')
    .gte('booking_date', startDate)
    .lte('booking_date', endDate)
    .in('booking_status', ['confirmed', 'completed'])

  if (!turfs || !bookings) return { rate: 0 }

  const days = Math.max(1, Math.ceil((new Date(endDate) - new Date(startDate)) / 86400000) + 1)

  let totalAvailableHours = 0
  turfs.forEach(t => {
    const [oh] = (t.opening_time || '06:00').split(':').map(Number)
    const [ch] = (t.closing_time || '23:00').split(':').map(Number)
    totalAvailableHours += (ch - oh) * days
  })

  let totalBookedHours = 0
  bookings.forEach(b => {
    const [sh, sm] = (b.start_time || '0:0').split(':').map(Number)
    const [eh, em] = (b.end_time || '0:0').split(':').map(Number)
    totalBookedHours += (eh * 60 + em - sh * 60 - sm) / 60
  })

  const rate = totalAvailableHours > 0 ? Math.round((totalBookedHours / totalAvailableHours) * 100) : 0

  return { rate: Math.min(rate, 100), totalAvailableHours, totalBookedHours }
}

/**
 * Get customer list with booking counts
 */
export const getCustomers = async (search = '', limit = 50, offset = 0) => {
  let query = supabase
    .from('bookings')
    .select('customer_name, customer_phone, customer_email')

  if (search) {
    query = query.or(`customer_name.ilike.%${search}%,customer_phone.ilike.%${search}%`)
  }

  const { data, error } = await query

  if (error) return { data: null, error }

  // Aggregate by phone number
  const customerMap = {}
  data.forEach(b => {
    const key = b.customer_phone || b.customer_name
    if (!customerMap[key]) {
      customerMap[key] = {
        name: b.customer_name,
        phone: b.customer_phone,
        email: b.customer_email,
        totalBookings: 0,
      }
    }
    customerMap[key].totalBookings += 1
    // Use latest name/email
    if (b.customer_name) customerMap[key].name = b.customer_name
    if (b.customer_email) customerMap[key].email = b.customer_email
  })

  const customers = Object.values(customerMap)
    .sort((a, b) => b.totalBookings - a.totalBookings)
    .slice(offset, offset + limit)

  return { data: customers, error: null }
}
