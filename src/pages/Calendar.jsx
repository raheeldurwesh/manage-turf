import { useState, useEffect, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Plus, Clock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Card, { CardContent } from '../components/ui/Card'
import Button from '../components/ui/Button'
import Select from '../components/ui/Select'
import Badge from '../components/ui/Badge'
import { Skeleton } from '../components/ui/Skeleton'
import { getBookingsByDate, getBookingsByDateRange, getBlockedSlots } from '../services/bookingService'
import { getActiveTurfs } from '../services/turfService'
import { format, addDays, subDays, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameDay, isSameMonth, isToday } from '../utils/dateUtils'
import { getTimeLabels } from '../utils/dateUtils'
import { formatTime12h, cn } from '../utils/helpers'
import { supabase } from '../services/supabase'

export default function CalendarPage() {
  const navigate = useNavigate()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState('month') // month | day
  const [selectedTurf, setSelectedTurf] = useState('')
  const [turfs, setTurfs] = useState([])
  const [bookings, setBookings] = useState([])
  const [dayBookings, setDayBookings] = useState([])
  const [blockedSlots, setBlockedSlots] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState(new Date())

  useEffect(() => { getActiveTurfs().then(({data}) => setTurfs(data||[])) }, [])

  // Fetch month bookings
  useEffect(() => {
    if (view !== 'month') return
    const fetchMonth = async () => {
      setLoading(true)
      const s = format(startOfMonth(currentDate), 'yyyy-MM-dd')
      const e = format(endOfMonth(currentDate), 'yyyy-MM-dd')
      const [bRes, blRes] = await Promise.all([
        getBookingsByDateRange(s, e),
        getBlockedSlots(s, e, selectedTurf || undefined),
      ])
      setBookings(bRes.data || [])
      setBlockedSlots(blRes.data || [])
      setLoading(false)
    }
    fetchMonth()
  }, [currentDate, view, selectedTurf])

  // Fetch day bookings
  useEffect(() => {
    if (view !== 'day') return
    const fetchDay = async () => {
      setLoading(true)
      const dateStr = format(selectedDay, 'yyyy-MM-dd')
      const { data } = await getBookingsByDate(dateStr, selectedTurf || undefined)
      setDayBookings(data || [])
      setLoading(false)
    }
    fetchDay()
  }, [selectedDay, view, selectedTurf])

  // Realtime
  useEffect(() => {
    const ch = supabase.channel('calendar-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        // Re-fetch depending on view
        if (view === 'month') {
          const s = format(startOfMonth(currentDate), 'yyyy-MM-dd')
          const e = format(endOfMonth(currentDate), 'yyyy-MM-dd')
          getBookingsByDateRange(s, e).then(({data}) => setBookings(data||[]))
        } else {
          const dateStr = format(selectedDay, 'yyyy-MM-dd')
          getBookingsByDate(dateStr, selectedTurf||undefined).then(({data}) => setDayBookings(data||[]))
        }
      })
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [currentDate, selectedDay, view, selectedTurf])

  // Calendar grid days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
    return eachDayOfInterval({ start: calStart, end: calEnd })
  }, [currentDate])

  // Count bookings per day
  const bookingsByDay = useMemo(() => {
    const map = {}
    bookings.forEach(b => {
      if (!map[b.booking_date]) map[b.booking_date] = []
      map[b.booking_date].push(b)
    })
    return map
  }, [bookings])

  const timeLabels = getTimeLabels(0, 23)
  const turfOpts = turfs.map(t => ({ value: t.id, label: t.name }))
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  const navigateMonth = (dir) => setCurrentDate(dir > 0 ? addMonths(currentDate, 1) : subMonths(currentDate, 1))
  const navigateDay = (dir) => setSelectedDay(dir > 0 ? addDays(selectedDay, 1) : subDays(selectedDay, 1))

  const openDay = (day) => { setSelectedDay(day); setView('day') }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button onClick={() => view === 'month' ? navigateMonth(-1) : navigateDay(-1)} className="p-2 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-xl transition-colors"><ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" /></button>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white min-w-[180px] text-center">
              {view === 'month' ? format(currentDate, 'MMMM yyyy') : format(selectedDay, 'EEEE, dd MMM yyyy')}
            </h2>
            <button onClick={() => view === 'month' ? navigateMonth(1) : navigateDay(1)} className="p-2 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-xl transition-colors"><ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" /></button>
          </div>
          <Button variant="ghost" size="sm" onClick={() => { setCurrentDate(new Date()); setSelectedDay(new Date()) }}>Today</Button>
        </div>
        <div className="flex items-center gap-3">
          <Select options={turfOpts} placeholder="All Turfs" value={selectedTurf} onChange={e => setSelectedTurf(e.target.value)} className="w-44" />
          <div className="flex bg-gray-100 dark:bg-dark-700 rounded-xl p-1">
            <button onClick={() => setView('month')} className={cn('px-3 py-1.5 text-sm font-medium rounded-lg transition-all', view === 'month' ? 'bg-white dark:bg-dark-600 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500')}>Month</button>
            <button onClick={() => setView('day')} className={cn('px-3 py-1.5 text-sm font-medium rounded-lg transition-all', view === 'day' ? 'bg-white dark:bg-dark-600 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500')}>Day</button>
          </div>
          <Button onClick={() => navigate('/bookings?action=new')} icon={Plus} size="sm">Book</Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4">
        {[{label:'Available',color:'bg-emerald-500'},{label:'Booked',color:'bg-red-500'},{label:'Blocked',color:'bg-amber-500'},{label:'Current',color:'bg-blue-500'}].map(l=>(
          <div key={l.label} className="flex items-center gap-2"><div className={cn('w-3 h-3 rounded-full',l.color)} /><span className="text-xs text-gray-500 dark:text-gray-400">{l.label}</span></div>
        ))}
      </div>

      {/* Month View */}
      {view === 'month' && (
        <Card hover={false}>
          <div className="overflow-x-auto">
            <div className="min-w-[700px]">
              {/* Weekday headers */}
              <div className="grid grid-cols-7 border-b border-gray-100 dark:border-dark-700">
                {weekDays.map(d => <div key={d} className="py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{d}</div>)}
              </div>
              {/* Days grid */}
              <div className="grid grid-cols-7">
                {calendarDays.map((day, i) => {
                  const dateStr = format(day, 'yyyy-MM-dd')
                  const dayBks = bookingsByDay[dateStr] || []
                  const isCurrentMonth = isSameMonth(day, currentDate)
                  const isToday_ = isToday(day)
                  return (
                    <button key={i} onClick={() => openDay(day)} className={cn(
                      'min-h-[100px] p-2 border-b border-r border-gray-50 dark:border-dark-700 text-left hover:bg-gray-50 dark:hover:bg-dark-800 transition-colors relative',
                      !isCurrentMonth && 'opacity-40'
                    )}>
                      <span className={cn('inline-flex items-center justify-center w-7 h-7 text-sm font-medium rounded-full',
                        isToday_ ? 'bg-primary-600 text-white' : 'text-gray-700 dark:text-gray-300'
                      )}>{format(day, 'd')}</span>
                      <div className="mt-1 space-y-0.5">
                        {dayBks.slice(0, 3).map(b => (
                          <div key={b.id} className={cn('text-[10px] px-1.5 py-0.5 rounded-md truncate font-medium',
                            b.booking_status === 'confirmed' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                            : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                          )}>
                            {formatTime12h(b.start_time)} {b.customer_name?.split(' ')[0]}
                          </div>
                        ))}
                        {dayBks.length > 3 && <p className="text-[10px] text-gray-400 pl-1.5">+{dayBks.length - 3} more</p>}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Day View */}
      {view === 'day' && (
        <Card hover={false}>
          <CardContent className="!p-0">
            {loading ? (
              <div className="p-6 space-y-3">{Array.from({length:8}).map((_,i)=><Skeleton key={i} className="h-14 w-full" />)}</div>
            ) : (
              <div className="divide-y divide-gray-50 dark:divide-dark-700">
                {timeLabels.map(slot => {
                  const slotBookings = dayBookings.filter(b => {
                    const bStart = parseInt(b.start_time?.split(':')[0]||0)
                    const bEnd = parseInt(b.end_time?.split(':')[0]||0)
                    return bEnd < bStart
                      ? (slot.hour >= bStart || slot.hour < bEnd)
                      : (slot.hour >= bStart && slot.hour < bEnd)
                  })
                  const isBlocked = blockedSlots.some(bl => {
                    const bs = parseInt(bl.start_time?.split(':')[0]||0)
                    const be = parseInt(bl.end_time?.split(':')[0]||0)
                    const matchesTime = be < bs
                      ? (slot.hour >= bs || slot.hour < be)
                      : (slot.hour >= bs && slot.hour < be)
                    return matchesTime && format(selectedDay,'yyyy-MM-dd') === bl.block_date
                  })
                  return (
                    <div key={slot.hour} className={cn('flex min-h-[56px]',
                      isBlocked ? 'bg-amber-50/50 dark:bg-amber-900/10' : slotBookings.length ? 'bg-blue-50/30 dark:bg-blue-900/10' : 'hover:bg-gray-50 dark:hover:bg-dark-800'
                    )}>
                      <div className="w-20 flex-shrink-0 py-3 px-4 text-xs font-medium text-gray-400 dark:text-gray-500 border-r border-gray-100 dark:border-dark-700">{slot.label}</div>
                      <div className="flex-1 py-2 px-3">
                        {isBlocked ? (
                          <div className="text-xs text-amber-600 dark:text-amber-400 font-medium py-1">🚫 Blocked</div>
                        ) : slotBookings.length > 0 ? (
                          <div className="space-y-1">
                            {slotBookings.map(b => (
                              <div key={b.id} className="flex items-center gap-3 py-1 px-3 rounded-lg bg-blue-100/50 dark:bg-blue-900/20 border border-blue-200/50 dark:border-blue-800/50">
                                <div className="w-1.5 h-8 rounded-full bg-blue-500" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{b.customer_name}</p>
                                  <p className="text-xs text-gray-500">{b.turfs?.name} • {formatTime12h(b.start_time)}-{formatTime12h(b.end_time)}</p>
                                </div>
                                <Badge color="blue" className="flex-shrink-0">{b.booking_status}</Badge>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
