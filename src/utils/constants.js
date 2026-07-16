// Application Constants

export const APP_NAME = 'TurfManager'
export const APP_DESCRIPTION = 'Turf Booking Management System'

// Booking statuses
export const BOOKING_STATUS = {
  CONFIRMED: 'confirmed',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no_show',
}

export const BOOKING_STATUS_LABELS = {
  [BOOKING_STATUS.CONFIRMED]: 'Confirmed',
  [BOOKING_STATUS.COMPLETED]: 'Completed',
  [BOOKING_STATUS.CANCELLED]: 'Cancelled',
  [BOOKING_STATUS.NO_SHOW]: 'No Show',
}

export const BOOKING_STATUS_COLORS = {
  [BOOKING_STATUS.CONFIRMED]: 'blue',
  [BOOKING_STATUS.COMPLETED]: 'green',
  [BOOKING_STATUS.CANCELLED]: 'red',
  [BOOKING_STATUS.NO_SHOW]: 'yellow',
}

// Payment statuses
export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PARTIAL: 'partial',
  PAID: 'paid',
  REFUNDED: 'refunded',
}

export const PAYMENT_STATUS_LABELS = {
  [PAYMENT_STATUS.PENDING]: 'Pending',
  [PAYMENT_STATUS.PARTIAL]: 'Partial',
  [PAYMENT_STATUS.PAID]: 'Paid',
  [PAYMENT_STATUS.REFUNDED]: 'Refunded',
}

export const PAYMENT_STATUS_COLORS = {
  [PAYMENT_STATUS.PENDING]: 'yellow',
  [PAYMENT_STATUS.PARTIAL]: 'purple',
  [PAYMENT_STATUS.PAID]: 'green',
  [PAYMENT_STATUS.REFUNDED]: 'red',
}

// Payment methods
export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'card', label: 'Card' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'other', label: 'Other' },
]

// Sport types
export const SPORT_TYPES = [
  { value: 'cricket', label: 'Cricket' },
  { value: 'football', label: 'Football' },
  { value: 'badminton', label: 'Badminton' },
  { value: 'tennis', label: 'Tennis' },
  { value: 'basketball', label: 'Basketball' },
  { value: 'volleyball', label: 'Volleyball' },
  { value: 'multi', label: 'Multi-Sport' },
]

// Notification types
export const NOTIFICATION_TYPE = {
  BOOKING_CREATED: 'booking_created',
  BOOKING_CANCELLED: 'booking_cancelled',
  BOOKING_UPDATED: 'booking_updated',
  PAYMENT_RECEIVED: 'payment_received',
  BOOKING_REMINDER: 'booking_reminder',
  TURF_UPDATED: 'turf_updated',
}

// Time slots (30 min intervals)
export const generateTimeSlots = (start = '06:00', end = '23:00') => {
  const slots = []
  let [h, m] = start.split(':').map(Number)
  const [endH, endM] = end.split(':').map(Number)
  
  while (h < endH || (h === endH && m <= endM)) {
    const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h
    const ampm = h >= 12 ? 'PM' : 'AM'
    const label = `${hour12}:${String(m).padStart(2, '0')} ${ampm}`
    slots.push({ value: time, label })
    m += 30
    if (m >= 60) { m = 0; h++ }
  }
  return slots
}

// Calendar colors
export const CALENDAR_COLORS = {
  available: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800', text: 'text-emerald-700 dark:text-emerald-400' },
  booked: { bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800', text: 'text-red-700 dark:text-red-400' },
  blocked: { bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800', text: 'text-amber-700 dark:text-amber-400' },
  current: { bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800', text: 'text-blue-700 dark:text-blue-400' },
}

// Amenities options
export const AMENITIES = [
  'Flood Lights',
  'Parking',
  'Washroom',
  'Drinking Water',
  'First Aid',
  'Changing Room',
  'Spectator Seating',
  'Cafeteria',
  'WiFi',
  'Equipment Rental',
]
