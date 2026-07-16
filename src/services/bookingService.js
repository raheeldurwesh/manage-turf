import { supabase } from './supabase'

/**
 * Create a booking using the safe RPC function (prevents double booking)
 */
export const createBooking = async (booking) => {
  // First try the RPC function for safe booking creation
  const { data, error } = await supabase.rpc('create_booking_safe', {
    p_turf_id: booking.turf_id,
    p_customer_name: booking.customer_name,
    p_customer_phone: booking.customer_phone,
    p_customer_email: booking.customer_email || null,
    p_booking_date: booking.booking_date,
    p_start_time: booking.start_time,
    p_end_time: booking.end_time,
    p_total_amount: booking.total_amount,
    p_payment_status: booking.payment_status || 'pending',
    p_notes: booking.notes || null,
  })

  if (error) {
    // If RPC not available, fall back to direct insert
    if (error.message?.includes('function') || error.code === '42883') {
      return createBookingDirect(booking)
    }
    return { data: null, error }
  }

  // Fetch the full booking record
  if (data) {
    const { data: fullBooking, error: fetchError } = await supabase
      .from('bookings')
      .select('*, turfs(name, location)')
      .eq('id', data)
      .single()

    return { data: fullBooking, error: fetchError }
  }

  return { data, error }
}

/**
 * Direct insert fallback (still protected by DB constraints)
 */
const createBookingDirect = async (booking) => {
  const { data, error } = await supabase
    .from('bookings')
    .insert({
      turf_id: booking.turf_id,
      customer_name: booking.customer_name,
      customer_phone: booking.customer_phone,
      customer_email: booking.customer_email || null,
      booking_date: booking.booking_date,
      start_time: booking.start_time,
      end_time: booking.end_time,
      total_amount: booking.total_amount,
      payment_status: booking.payment_status || 'pending',
      booking_status: 'confirmed',
      notes: booking.notes || null,
    })
    .select('*, turfs(name, location)')
    .single()

  return { data, error }
}

/**
 * Fetch bookings with filters
 */
export const getBookings = async ({
  startDate,
  endDate,
  turfId,
  status,
  search,
  limit = 50,
  offset = 0,
} = {}) => {
  let query = supabase
    .from('bookings')
    .select('*, turfs(name, sport_type, location)', { count: 'exact' })
    .order('booking_date', { ascending: false })
    .order('start_time', { ascending: true })
    .range(offset, offset + limit - 1)

  if (startDate) query = query.gte('booking_date', startDate)
  if (endDate) query = query.lte('booking_date', endDate)
  if (turfId) query = query.eq('turf_id', turfId)
  if (status) query = query.eq('booking_status', status)
  if (search) {
    query = query.or(`customer_name.ilike.%${search}%,customer_phone.ilike.%${search}%`)
  }

  const { data, error, count } = await query
  return { data, error, count }
}

/**
 * Get today's bookings
 */
export const getTodayBookings = async () => {
  const today = new Date().toISOString().split('T')[0]
  const { data, error } = await supabase
    .from('bookings')
    .select('*, turfs(name, sport_type, location)')
    .eq('booking_date', today)
    .neq('booking_status', 'cancelled')
    .order('start_time', { ascending: true })

  return { data, error }
}

/**
 * Get upcoming bookings (next 7 days)
 */
export const getUpcomingBookings = async () => {
  const today = new Date().toISOString().split('T')[0]
  const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('bookings')
    .select('*, turfs(name, sport_type, location)')
    .gte('booking_date', today)
    .lte('booking_date', nextWeek)
    .neq('booking_status', 'cancelled')
    .order('booking_date', { ascending: true })
    .order('start_time', { ascending: true })
    .limit(20)

  return { data, error }
}

/**
 * Get bookings for a specific date (calendar use)
 */
export const getBookingsByDate = async (date, turfId = null) => {
  let query = supabase
    .from('bookings')
    .select('*, turfs(name, location)')
    .eq('booking_date', date)
    .neq('booking_status', 'cancelled')
    .order('start_time', { ascending: true })

  if (turfId) query = query.eq('turf_id', turfId)

  const { data, error } = await query
  return { data, error }
}

/**
 * Get bookings for a date range (calendar month view)
 */
export const getBookingsByDateRange = async (startDate, endDate) => {
  const { data, error } = await supabase
    .from('bookings')
    .select('id, turf_id, booking_date, start_time, end_time, booking_status, customer_name, turfs(name)')
    .gte('booking_date', startDate)
    .lte('booking_date', endDate)
    .neq('booking_status', 'cancelled')

  return { data, error }
}

/**
 * Update booking
 */
export const updateBooking = async (id, updates) => {
  const { data, error } = await supabase
    .from('bookings')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*, turfs(name, location)')
    .single()

  return { data, error }
}

/**
 * Cancel a booking
 */
export const cancelBooking = async (id) => {
  return updateBooking(id, { booking_status: 'cancelled' })
}

/**
 * Complete a booking
 */
export const completeBooking = async (id) => {
  return updateBooking(id, { booking_status: 'completed' })
}

/**
 * Get blocked slots for a date range
 */
export const getBlockedSlots = async (startDate, endDate, turfId = null) => {
  let query = supabase
    .from('blocked_slots')
    .select('*')
    .gte('block_date', startDate)
    .lte('block_date', endDate)

  if (turfId) query = query.eq('turf_id', turfId)

  const { data, error } = await query
  return { data, error }
}

/**
 * Check slot availability
 */
export const checkSlotAvailability = async (turfId, date, startTime, endTime, excludeBookingId = null) => {
  let query = supabase
    .from('bookings')
    .select('id')
    .eq('turf_id', turfId)
    .eq('booking_date', date)
    .neq('booking_status', 'cancelled')
    .lt('start_time', endTime)
    .gt('end_time', startTime)

  if (excludeBookingId) {
    query = query.neq('id', excludeBookingId)
  }

  const { data, error } = await query
  return { available: !data?.length, conflicting: data, error }
}
