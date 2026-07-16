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
  
  let startMinutes = sh * 60 + sm
  let endMinutes = eh * 60 + em
  
  if (endMinutes <= startMinutes) {
    // Overnight booking crossing midnight
    endMinutes += 24 * 60
  }
  
  return (endMinutes - startMinutes) / 60
}

/**
 * Calculate price based on duration and price per hour
 */
export const calculatePrice = (startTime, endTime, pricePerHour) => {
  const duration = calculateDuration(startTime, endTime)
  return Math.round(duration * pricePerHour)
}

/**
 * Calculate optimized price based on date, time slots, and pricing rules
 */
export const calculateOptimizedPrice = (dateStr, startTime, endTime, pricePerHour, pricingRules = []) => {
  if (!startTime || !endTime || !dateStr) return 0
  
  const [startH, startM] = startTime.split(':').map(Number)
  const [endH, endM] = endTime.split(':').map(Number)
  
  const startMinutes = startH * 60 + startM
  let endMinutes = endH * 60 + endM
  
  if (endMinutes <= startMinutes) {
    // Overnight booking crossing midnight
    endMinutes += 24 * 60
  }
  
  const duration = (endMinutes - startMinutes) / 60
  if (duration <= 0) return 0

  // If there are no pricing rules, return base calculation
  if (!pricingRules || pricingRules.length === 0) {
    return Math.round(duration * pricePerHour)
  }

  // Parse booking date safely (local timezone safe)
  const parts = dateStr.split('-')
  const dateObj = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
  const dayOfWeek = dateObj.getDay()

  let totalAmount = 0

  // We check in 30-minute intervals
  const interval = 30 // minutes
  for (let current = startMinutes; current < endMinutes; current += interval) {
    const slotStartMin = current
    const slotEndMin = Math.min(current + interval, endMinutes)
    const slotDurationHours = (slotEndMin - slotStartMin) / 60

    // Adjust for next day if slot starts after midnight
    const isNextDay = slotStartMin >= 1440
    const checkDay = isNextDay ? (dayOfWeek + 1) % 7 : dayOfWeek
    const checkMin = isNextDay ? slotStartMin - 1440 : slotStartMin

    // Find rules that apply to this slot
    // A rule applies if the day matches and the time matches
    const activeRules = pricingRules.filter(rule => {
      // Check day of week
      const dayMatches = rule.days?.includes(checkDay)
      
      // Check time range
      const [rStartH, rStartM] = rule.startTime.split(':').map(Number)
      const [rEndH, rEndM] = rule.endTime.split(':').map(Number)
      const ruleStartMinutes = rStartH * 60 + rStartM
      const ruleEndMinutes = rEndH * 60 + rEndM

      // The slot starts inside the rule time range
      const timeMatches = checkMin >= ruleStartMinutes && checkMin < ruleEndMinutes

      return dayMatches && timeMatches
    })

    if (activeRules.length > 0) {
      // Find the rule that produces the highest price
      let highestRate = pricePerHour
      activeRules.forEach(rule => {
        let ruleRate = pricePerHour
        if (rule.rateType === 'multiplier') {
          ruleRate = pricePerHour * Number(rule.value)
        } else if (rule.rateType === 'surcharge') {
          ruleRate = pricePerHour + Number(rule.value)
        } else if (rule.rateType === 'fixed') {
          ruleRate = Number(rule.value)
        }
        if (ruleRate > highestRate) {
          highestRate = ruleRate
        }
      })
      totalAmount += slotDurationHours * highestRate
    } else {
      totalAmount += slotDurationHours * pricePerHour
    }
  }

  return Math.round(totalAmount)
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
