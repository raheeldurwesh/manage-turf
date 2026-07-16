import { format, parseISO, isToday, isTomorrow, isYesterday, differenceInMinutes } from 'date-fns'

/**
 * Format currency in INR
 */
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0)
}

/**
 * Format phone number for display
 */
export const formatPhone = (phone) => {
  if (!phone) return ''
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 5)} ${cleaned.slice(5)}`
  }
  return phone
}

/**
 * Get initials from a name
 */
export const getInitials = (name) => {
  if (!name) return '?'
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

/**
 * Format a relative date label
 */
export const getRelativeDateLabel = (dateStr) => {
  const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr
  if (isToday(date)) return 'Today'
  if (isTomorrow(date)) return 'Tomorrow'
  if (isYesterday(date)) return 'Yesterday'
  return format(date, 'dd MMM yyyy')
}

/**
 * Format time from 24h to 12h
 */
export const formatTime12h = (time) => {
  if (!time) return ''
  const [h, m] = time.split(':').map(Number)
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${hour12}:${String(m).padStart(2, '0')} ${ampm}`
}

/**
 * Calculate duration in hours between two time strings
 */
export const calculateDuration = (startTime, endTime) => {
  if (!startTime || !endTime) return 0
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  return (eh * 60 + em - sh * 60 - sm) / 60
}

/**
 * Calculate price based on duration and price per hour
 */
export const calculatePrice = (startTime, endTime, pricePerHour) => {
  const duration = calculateDuration(startTime, endTime)
  return Math.round(duration * pricePerHour)
}

/**
 * Truncate text with ellipsis
 */
export const truncate = (str, length = 30) => {
  if (!str) return ''
  return str.length > length ? str.slice(0, length) + '...' : str
}

/**
 * Generate a unique color for a name (consistent)
 */
export const nameToColor = (name) => {
  const colors = [
    'bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-500',
    'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-teal-500',
  ]
  if (!name) return colors[0]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

/**
 * Validate phone number (Indian)
 */
export const isValidPhone = (phone) => {
  return /^[6-9]\d{9}$/.test(phone?.replace(/\D/g, ''))
}

/**
 * Validate email
 */
export const isValidEmail = (email) => {
  if (!email) return true // optional field
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

/**
 * Debounce function
 */
export const debounce = (func, wait = 300) => {
  let timeout
  return (...args) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

/**
 * Class name merge helper
 */
export const cn = (...classes) => {
  return classes.filter(Boolean).join(' ')
}
