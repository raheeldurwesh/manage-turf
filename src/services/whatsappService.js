/**
 * Generate a WhatsApp deep link (wa.me) to send a message directly from the owner's phone/web.
 */
export const generateWhatsAppLink = (phone, message) => {
  if (!phone) return ''
  // Format phone to ensure it has country code (defaulting to 91 for India if exactly 10 digits)
  const cleaned = phone.replace(/\D/g, '')
  const formattedPhone = cleaned.length === 10 ? `91${cleaned}` : cleaned
  
  return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`
}

/**
 * Format time to HH:MM format by removing seconds if present
 */
const formatTimeHM = (timeStr) => {
  if (!timeStr) return ''
  const parts = timeStr.split(':')
  if (parts.length >= 2) {
    return `${parts[0]}:${parts[1]}`
  }
  return timeStr
}

const MOTIVATIONAL_QUOTES = [
  "Hard work beats talent when talent fails to work hard.",
  "The more difficult the victory, the greater the happiness in winning.",
  "Champions keep playing until they get it right.",
  "You miss 100% of the shots you don't take.",
  "Today's preparation determines tomorrow's achievement.",
  "Play with passion, win with character!",
  "The ground is waiting. See you on the turf!",
  "Great things come from hard work and perseverance. Let's play!"
]

const getRandomQuote = () => {
  const index = Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)
  return MOTIVATIONAL_QUOTES[index]
}

/**
 * Get link for booking confirmation
 */
export const getBookingConfirmationLink = (booking) => {
  const turfName = booking.turfs?.name || ''
  const turfLocation = booking.turfs?.location || ''
  const startTime = formatTimeHM(booking.start_time)
  const endTime = formatTimeHM(booking.end_time)
  
  let message = "Hi " + booking.customer_name + ",\n\n" +
    "Your booking is confirmed!\n\n" +
    "\u2022 Turf: " + turfName + "\n" +
    "\u2022 Date: " + booking.booking_date + "\n" +
    "\u2022 Time: " + startTime + " to " + endTime + "\n" +
    "\u2022 Amount: \u20B9" + booking.total_amount

  // Append Google Maps URL if turf has a location
  if (turfLocation.trim()) {
    message += "\n\u2022 Location: https://maps.google.com/?q=" + encodeURIComponent(turfLocation.trim())
  }

  message += "\n\n" +
    "Important Instructions:\n" +
    "1. Please arrive 10 minutes prior to your slot.\n" +
    "2. Only flat/turf shoes allowed (no metal studs).\n\n" +
    "Quote of the day:\n\"" + getRandomQuote() + "\"\n\n" +
    "Thank you for choosing us!"

  return generateWhatsAppLink(booking.customer_phone, message)
}

/**
 * Get link for booking cancellation
 */
export const getBookingCancellationLink = (booking) => {
  const turfName = booking.turfs?.name || ''
  const startTime = formatTimeHM(booking.start_time)
  const endTime = formatTimeHM(booking.end_time)

  const message = "Hi " + booking.customer_name + ",\n\n" +
    "Your booking at " + turfName + " on " + booking.booking_date + " from " + startTime + " to " + endTime + " has been cancelled.\n\n" +
    "Please contact us if you have any questions."

  return generateWhatsAppLink(booking.customer_phone, message)
}

/**
 * Get link for payment received
 */
export const getPaymentConfirmationLink = (booking) => {
  const turfName = booking.turfs?.name || ''

  const message = "Hi " + booking.customer_name + ",\n\n" +
    "We have received your payment of \u{20B9}" + booking.total_amount + " for your booking at " + turfName + ".\n\n" +
    "Thank you!"

  return generateWhatsAppLink(booking.customer_phone, message)
}


