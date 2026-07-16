import {
  format,
  parseISO,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addDays,
  subDays,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  isSameDay,
  isSameMonth,
  isToday as isTodayFn,
  isBefore,
  isAfter,
  setHours,
  setMinutes,
  getHours,
  getMinutes,
  differenceInHours,
  differenceInMinutes,
} from 'date-fns'

export {
  format,
  parseISO,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addDays,
  subDays,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  isSameDay,
  isSameMonth,
  isTodayFn as isToday,
  isBefore,
  isAfter,
  setHours,
  setMinutes,
  getHours,
  getMinutes,
  differenceInHours,
  differenceInMinutes,
}

/**
 * Get calendar grid days for a month view (includes padding days from prev/next month)
 */
export const getCalendarDays = (date) => {
  const monthStart = startOfMonth(date)
  const monthEnd = endOfMonth(date)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 }) // Monday start
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  return eachDayOfInterval({ start: calStart, end: calEnd })
}

/**
 * Get the week days array for a week view
 */
export const getWeekDays = (date) => {
  const weekStart = startOfWeek(date, { weekStartsOn: 1 })
  return eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) })
}

/**
 * Format a date for display
 */
export const formatDate = (date, fmt = 'dd MMM yyyy') => {
  if (!date) return ''
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, fmt)
}

/**
 * Format date for Supabase query (YYYY-MM-DD)
 */
export const toDateString = (date) => {
  return format(date, 'yyyy-MM-dd')
}

/**
 * Check if a time slot overlaps with bookings
 */
export const isSlotBooked = (slotStart, slotEnd, bookings) => {
  return bookings.some(booking => {
    const bStart = booking.start_time
    const bEnd = booking.end_time
    return slotStart < bEnd && slotEnd > bStart
  })
}

/**
 * Check if a time slot is blocked
 */
export const isSlotBlocked = (slotStart, slotEnd, blockedSlots) => {
  return blockedSlots.some(blocked => {
    return slotStart < blocked.end_time && slotEnd > blocked.start_time
  })
}

/**
 * Get today's date string
 */
export const getTodayString = () => toDateString(new Date())

/**
 * Get an array of time labels for the calendar grid
 */
export const getTimeLabels = (startHour = 6, endHour = 23) => {
  const labels = []
  for (let h = startHour; h <= endHour; h++) {
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h
    const ampm = h >= 12 ? 'PM' : 'AM'
    labels.push({
      hour: h,
      label: `${hour12} ${ampm}`,
      value: `${String(h).padStart(2, '0')}:00`,
    })
  }
  return labels
}
