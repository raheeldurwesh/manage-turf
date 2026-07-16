import { useState } from 'react'
import { Bell, Calendar, Wallet, MapPin, XCircle, CheckCircle, Trash2, CheckCheck } from 'lucide-react'
import Card, { CardContent } from '../components/ui/Card'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import { Skeleton } from '../components/ui/Skeleton'
import { useNotifications } from '../context/NotificationContext'
import { cn } from '../utils/helpers'
import { format, parseISO } from '../utils/dateUtils'

const icons = {
  booking_created: { icon: Calendar, color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/30' },
  booking_cancelled: { icon: XCircle, color: 'text-red-500 bg-red-50 dark:bg-red-900/30' },
  booking_updated: { icon: CheckCircle, color: 'text-cyan-500 bg-cyan-50 dark:bg-cyan-900/30' },
  payment_received: { icon: Wallet, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/30' },
  booking_reminder: { icon: Bell, color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/30' },
  turf_updated: { icon: MapPin, color: 'text-purple-500 bg-purple-50 dark:bg-purple-900/30' },
}

export default function Notifications() {
  const { notifications, loading, markAsRead, markAllAsRead, deleteNotification, unreadCount } = useNotifications()
  const [filter, setFilter] = useState('all') // all | unread

  const filtered = filter === 'unread' ? notifications.filter(n => !n.is_read) : notifications

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><h1 className="text-xl font-bold text-gray-900 dark:text-white">Notifications</h1><p className="text-sm text-gray-500">{unreadCount} unread</p></div>
        {unreadCount > 0 && <Button variant="secondary" size="sm" icon={CheckCheck} onClick={markAllAsRead}>Mark All Read</Button>}
      </div>

      <div className="flex gap-2">
        {['all', 'unread'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={cn(
            'px-4 py-2 text-sm font-medium rounded-xl transition-all',
            filter === f ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-dark-700'
          )}>{f === 'all' ? 'All' : 'Unread'}</button>
        ))}
      </div>

      <Card hover={false}>
        {loading ? (
          <CardContent><div className="space-y-3">{Array.from({length:5}).map((_,i)=><Skeleton key={i} className="h-16 w-full" />)}</div></CardContent>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Bell} title={filter === 'unread' ? 'All caught up!' : 'No notifications'} description={filter === 'unread' ? 'You have no unread notifications.' : 'Notifications will appear here.'} />
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-dark-700">
            {filtered.map(n => {
              const config = icons[n.type] || icons.booking_created
              const Icon = config.icon
              return (
                <div key={n.id} className={cn('flex items-start gap-4 p-4 hover:bg-gray-50 dark:hover:bg-dark-700/50 transition-colors', !n.is_read && 'bg-primary-50/30 dark:bg-primary-900/5')}>
                  <div className={cn('p-2.5 rounded-xl flex-shrink-0', config.color)}><Icon className="w-5 h-5" /></div>
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm', n.is_read ? 'text-gray-600 dark:text-gray-400' : 'text-gray-900 dark:text-white font-medium')}>{n.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{n.message}</p>
                    <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">{n.created_at ? format(parseISO(n.created_at), 'dd MMM yyyy, hh:mm a') : ''}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!n.is_read && <button onClick={() => markAsRead(n.id)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-dark-600 rounded-lg" title="Mark read"><CheckCircle className="w-4 h-4 text-gray-400 hover:text-primary-500" /></button>}
                    <button onClick={() => deleteNotification(n.id)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-dark-600 rounded-lg" title="Delete"><Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" /></button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}
