import { useState, useEffect } from 'react'
import { Users, Search, Phone, Mail, Calendar, Trophy } from 'lucide-react'
import Card, { CardContent } from '../components/ui/Card'
import Input from '../components/ui/Input'
import EmptyState from '../components/ui/EmptyState'
import { Skeleton } from '../components/ui/Skeleton'
import { getCustomers } from '../services/reportService'
import { formatPhone, getInitials, nameToColor, cn, debounce } from '../utils/helpers'

export default function Customers() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const fetchCustomers = async (query = '') => {
    setLoading(true)
    const { data } = await getCustomers(query)
    setCustomers(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchCustomers() }, [])

  const handleSearch = debounce((val) => fetchCustomers(val), 400)

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><h1 className="text-xl font-bold text-gray-900 dark:text-white">Customers</h1><p className="text-sm text-gray-500">{customers.length} customers</p></div>
      </div>

      <div className="max-w-md"><Input placeholder="Search customers..." icon={Search} value={search} onChange={e => { setSearch(e.target.value); handleSearch(e.target.value) }} /></div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{Array.from({length:6}).map((_,i)=><div key={i} className="glass-card-static p-6 space-y-3"><Skeleton className="h-12 w-12 rounded-full" /><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/2" /></div>)}</div>
      ) : customers.length === 0 ? (
        <EmptyState icon={Users} title="No customers yet" description="Customers will appear here once bookings are created." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {customers.map((c, i) => (
            <Card key={i}>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className={cn('w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold', nameToColor(c.name))}>
                    {getInitials(c.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{c.name}</h3>
                    {c.phone && <p className="text-xs text-gray-500 flex items-center gap-1"><Phone className="w-3 h-3" />{formatPhone(c.phone)}</p>}
                    {c.email && <p className="text-xs text-gray-400 flex items-center gap-1"><Mail className="w-3 h-3" />{c.email}</p>}
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-gray-100 dark:border-dark-700 flex items-center justify-between">
                  <span className="text-xs text-gray-500 flex items-center gap-1"><Calendar className="w-3 h-3" />{c.totalBookings} bookings</span>
                  {c.totalBookings >= 10 && <span className="text-xs text-amber-500 flex items-center gap-1"><Trophy className="w-3 h-3" />Loyal</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
