import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Search, Calendar, Clock, Phone, User, MapPin, CheckCircle, XCircle, Pencil, Eye, ChevronLeft, ChevronRight, Wallet, X, MessageCircle } from 'lucide-react'
import Card, { CardContent } from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Modal from '../components/ui/Modal'
import EmptyState from '../components/ui/EmptyState'
import { SkeletonTable } from '../components/ui/Skeleton'
import { formatCurrency, formatTime12h, formatPhone, getInitials, nameToColor, cn, calculatePrice, calculateOptimizedPrice, isValidPhone, getRelativeDateLabel } from '../utils/helpers'
import { getBookings, createBooking, updateBooking, cancelBooking, completeBooking, checkSlotAvailability } from '../services/bookingService'
import { getActiveTurfs } from '../services/turfService'
import { getBookingConfirmationLink } from '../services/whatsappService'
import { BOOKING_STATUS_LABELS, BOOKING_STATUS_COLORS, PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS, generateTimeSlots } from '../utils/constants'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../services/supabase'

const INIT = { customer_name:'', customer_phone:'', customer_email:'', turf_id:'', booking_date: new Date().toISOString().split('T')[0], start_time:'', end_time:'', total_amount:0, payment_status:'pending', notes:'' }

export default function Bookings() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { toast } = useToast()
  const { profile } = useAuth()
  const [bookings, setBookings] = useState([])
  const [turfs, setTurfs] = useState([])
  const [loading, setLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [turfFilter, setTurfFilter] = useState('')
  const [page, setPage] = useState(0)
  const pageSize = 15
  const [showModal, setShowModal] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [editing, setEditing] = useState(null)
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState(INIT)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const timeSlots = generateTimeSlots()

  const fetchBookings = useCallback(async () => {
    setLoading(true)
    const { data, error, count } = await getBookings({ status: statusFilter||undefined, turfId: turfFilter||undefined, search: search||undefined, limit: pageSize, offset: page*pageSize })
    if (!error) { setBookings(data||[]); setTotalCount(count||0) }
    setLoading(false)
  }, [statusFilter, turfFilter, search, page])

  useEffect(() => { getActiveTurfs().then(({data}) => setTurfs(data||[])) }, [])
  useEffect(() => { fetchBookings() }, [fetchBookings])
  useEffect(() => { if (searchParams.get('action')==='new') { setEditing(null); setForm(INIT); setShowModal(true); setSearchParams({}) } }, [searchParams])

  useEffect(() => {
    const ch = supabase.channel('bookings-list').on('postgres_changes',{event:'*',schema:'public',table:'bookings'},()=>fetchBookings()).subscribe()
    return () => supabase.removeChannel(ch)
  }, [fetchBookings])

  useEffect(() => {
    if (form.turf_id && form.start_time && form.end_time && form.booking_date) {
      const t = turfs.find(t=>t.id===form.turf_id)
      if (t) {
        const turfRules = profile?.settings?.pricingRules?.[form.turf_id] || []
        setForm(p=>({...p, total_amount: Math.max(0, calculateOptimizedPrice(form.booking_date, form.start_time, form.end_time, t.price_per_hour, turfRules))}))
      }
    }
  }, [form.turf_id, form.start_time, form.end_time, form.booking_date, turfs, profile])

  const validate = () => {
    const e = {}
    if (!form.customer_name.trim()) e.customer_name='Required'
    if (!form.customer_phone.trim()) e.customer_phone='Required'
    else if (!isValidPhone(form.customer_phone)) e.customer_phone='Invalid phone'
    if (!form.turf_id) e.turf_id='Required'
    if (!form.booking_date) e.booking_date='Required'
    if (!form.start_time) e.start_time='Required'
    if (!form.end_time) e.end_time='Required'
    if (form.start_time && form.end_time && form.start_time>=form.end_time) e.end_time='Must be after start'
    setErrors(e); return !Object.keys(e).length
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    const { available } = await checkSlotAvailability(form.turf_id, form.booking_date, form.start_time, form.end_time, editing?.id)
    if (!available) { toast.error('Slot already booked!'); setSaving(false); return }
    const result = editing ? await updateBooking(editing.id, form) : await createBooking(form)
    if (result.error) { 
      toast.error(result.error.message||'Failed') 
    } else { 
      toast.success(editing?'Updated!':'Created!')
      setShowModal(false)
      setForm(INIT)
      setEditing(null)
      fetchBookings()
      
      // Automatically trigger WhatsApp redirect on confirmation
      if (result.data && result.data.booking_status === 'confirmed') {
        const waLink = getBookingConfirmationLink(result.data)
        if (waLink) {
          window.open(waLink, '_blank')
        }
      }
    }
    setSaving(false)
  }

  const openEdit = (b) => { setEditing(b); setForm({ customer_name:b.customer_name, customer_phone:b.customer_phone, customer_email:b.customer_email||'', turf_id:b.turf_id, booking_date:b.booking_date, start_time:b.start_time, end_time:b.end_time, total_amount:b.total_amount, payment_status:b.payment_status, notes:b.notes||'' }); setErrors({}); setShowModal(true) }

  const turfOpts = turfs.map(t=>({value:t.id, label:`${t.name} (₹${t.price_per_hour}/hr)`}))
  const statusOpts = Object.entries(BOOKING_STATUS_LABELS).map(([v,l])=>({value:v,label:l}))
  const payOpts = Object.entries(PAYMENT_STATUS_LABELS).map(([v,l])=>({value:v,label:l}))
  const totalPages = Math.ceil(totalCount/pageSize)

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><h1 className="text-xl font-bold text-gray-900 dark:text-white">Bookings</h1><p className="text-sm text-gray-500">{totalCount} total</p></div>
        <Button onClick={()=>{setEditing(null);setForm(INIT);setErrors({});setShowModal(true)}} icon={Plus}>New Booking</Button>
      </div>

      <Card hover={false}><CardContent className="!p-4"><div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px]"><Input placeholder="Search name or phone..." icon={Search} value={search} onChange={e=>{setSearch(e.target.value);setPage(0)}} /></div>
        <Select options={statusOpts} placeholder="All Status" value={statusFilter} onChange={e=>{setStatusFilter(e.target.value);setPage(0)}} className="w-40" />
        <Select options={turfOpts} placeholder="All Turfs" value={turfFilter} onChange={e=>{setTurfFilter(e.target.value);setPage(0)}} className="w-48" />
        {(search||statusFilter||turfFilter)&&<Button variant="ghost" size="sm" icon={X} onClick={()=>{setSearch('');setStatusFilter('');setTurfFilter('');setPage(0)}}>Clear</Button>}
      </div></CardContent></Card>

      <Card hover={false}>
        {loading ? <CardContent><SkeletonTable rows={5} cols={6} /></CardContent> : bookings.length===0 ? (
          <EmptyState icon={Calendar} title="No bookings found" description={search||statusFilter?'Adjust filters.':'Create your first booking.'} actionLabel={!search&&!statusFilter?'New Booking':undefined} onAction={!search&&!statusFilter?()=>{setForm(INIT);setShowModal(true)}:undefined} />
        ) : (<>
          <div className="hidden md:block overflow-x-auto"><table className="w-full"><thead><tr className="border-b border-gray-100 dark:border-dark-700">
            {['Customer','Turf','Date & Time','Amount','Status','Actions'].map(h=><th key={h} className={`${h==='Actions'?'text-right':'text-left'} py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider`}>{h}</th>)}
          </tr></thead><tbody className="divide-y divide-gray-50 dark:divide-dark-700">
            {bookings.map(b=><tr key={b.id} className="hover:bg-gray-50/50 dark:hover:bg-dark-700/50 transition-colors">
              <td className="py-3 px-4"><div className="flex items-center gap-3"><div className={cn('w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-semibold',nameToColor(b.customer_name))}>{getInitials(b.customer_name)}</div><div><p className="text-sm font-medium text-gray-900 dark:text-white">{b.customer_name}</p><p className="text-xs text-gray-400">{formatPhone(b.customer_phone)}</p></div></div></td>
              <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">{b.turfs?.name||'—'}</td>
              <td className="py-3 px-4"><p className="text-sm text-gray-900 dark:text-white">{getRelativeDateLabel(b.booking_date)}</p><p className="text-xs text-gray-400">{formatTime12h(b.start_time)} - {formatTime12h(b.end_time)}</p></td>
              <td className="py-3 px-4"><p className="text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(b.total_amount)}</p><Badge color={PAYMENT_STATUS_COLORS[b.payment_status]} className="mt-1">{PAYMENT_STATUS_LABELS[b.payment_status]}</Badge></td>
              <td className="py-3 px-4"><Badge color={BOOKING_STATUS_COLORS[b.booking_status]}>{BOOKING_STATUS_LABELS[b.booking_status]}</Badge></td>
              <td className="py-3 px-4"><div className="flex items-center justify-end gap-1">
                <button onClick={()=>{setSelected(b);setShowDetail(true)}} className="p-2 hover:bg-gray-100 dark:hover:bg-dark-600 rounded-lg" title="View"><Eye className="w-4 h-4 text-gray-400" /></button>
                {b.booking_status==='confirmed'&&<><button onClick={()=>openEdit(b)} className="p-2 hover:bg-gray-100 dark:hover:bg-dark-600 rounded-lg" title="Edit"><Pencil className="w-4 h-4 text-gray-400" /></button>
                <button onClick={()=>completeBooking(b.id).then(()=>toast.success('Completed'))} className="p-2 hover:bg-gray-100 dark:hover:bg-dark-600 rounded-lg" title="Complete"><CheckCircle className="w-4 h-4 text-gray-400" /></button>
                <button onClick={()=>{if(confirm('Cancel?'))cancelBooking(b.id).then(()=>toast.success('Cancelled'))}} className="p-2 hover:bg-gray-100 dark:hover:bg-dark-600 rounded-lg" title="Cancel"><XCircle className="w-4 h-4 text-gray-400" /></button></>}
              </div></td>
            </tr>)}
          </tbody></table></div>

          <div className="md:hidden space-y-3 p-4">
            {bookings.map(b => (
              <div 
                key={b.id} 
                onClick={() => { setSelected(b); setShowDetail(true) }} 
                className="p-4 rounded-xl bg-gray-50 dark:bg-dark-700/50 space-y-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors border border-transparent hover:border-gray-200 dark:hover:border-dark-600"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn('w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold', nameToColor(b.customer_name))}>
                      {getInitials(b.customer_name)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{b.customer_name}</p>
                      <p className="text-xs text-gray-400">{formatPhone(b.customer_phone)}</p>
                    </div>
                  </div>
                  <Badge color={BOOKING_STATUS_COLORS[b.booking_status]}>{BOOKING_STATUS_LABELS[b.booking_status]}</Badge>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">{b.turfs?.name} • {getRelativeDateLabel(b.booking_date)}</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(b.total_amount)}</span>
                </div>
                
                {b.booking_status === 'confirmed' && (
                  <div className="flex gap-2 pt-1" onClick={e => e.stopPropagation()}>
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      icon={Pencil} 
                      onClick={(e) => { e.stopPropagation(); openEdit(b); }}
                      className="flex-1 justify-center"
                    >
                      Edit
                    </Button>
                    <Button 
                      size="sm" 
                      icon={CheckCircle} 
                      onClick={(e) => { e.stopPropagation(); completeBooking(b.id).then(() => toast.success('Done')); }}
                      className="flex-1 justify-center"
                    >
                      Complete
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {totalPages>1&&<div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 dark:border-dark-700">
            <p className="text-sm text-gray-500">Showing {page*pageSize+1}-{Math.min((page+1)*pageSize,totalCount)} of {totalCount}</p>
            <div className="flex gap-2"><Button variant="ghost" size="sm" icon={ChevronLeft} onClick={()=>setPage(p=>Math.max(0,p-1))} disabled={page===0}>Prev</Button><Button variant="ghost" size="sm" onClick={()=>setPage(p=>p+1)} disabled={page>=totalPages-1}>Next</Button></div>
          </div>}
        </>)}
      </Card>

      <Modal isOpen={showModal} onClose={()=>{setShowModal(false);setEditing(null)}} title={editing?'Edit Booking':'New Booking'} size="lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Customer Name *" icon={User} value={form.customer_name} onChange={e=>setForm({...form,customer_name:e.target.value})} error={errors.customer_name} />
          <Input label="Phone *" icon={Phone} value={form.customer_phone} onChange={e=>setForm({...form,customer_phone:e.target.value})} error={errors.customer_phone} />
          <Input label="Email" type="email" value={form.customer_email} onChange={e=>setForm({...form,customer_email:e.target.value})} />
          <Select label="Turf *" options={turfOpts} placeholder="Select Turf" value={form.turf_id} onChange={e=>setForm({...form,turf_id:e.target.value})} error={errors.turf_id} />
          <Input label="Date *" type="date" value={form.booking_date} onChange={e=>setForm({...form,booking_date:e.target.value})} error={errors.booking_date} />
          <div className="grid grid-cols-2 gap-3"><Select label="Start *" options={timeSlots} placeholder="Start" value={form.start_time} onChange={e=>setForm({...form,start_time:e.target.value})} error={errors.start_time} /><Select label="End *" options={timeSlots} placeholder="End" value={form.end_time} onChange={e=>setForm({...form,end_time:e.target.value})} error={errors.end_time} /></div>
          <div>
            <Input label="Amount (₹)" type="number" icon={Wallet} value={form.total_amount} onChange={e=>setForm({...form,total_amount:Number(e.target.value)})} />
            {(() => {
              const t = turfs.find(x => x.id === form.turf_id)
              if (t && form.start_time && form.end_time) {
                const basePrice = calculatePrice(form.start_time, form.end_time, t.price_per_hour)
                if (form.total_amount > basePrice) {
                  return (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1 font-semibold">
                      ⚡ Peak rate applied (Base: ₹{basePrice})
                    </p>
                  )
                }
              }
              return null
            })()}
          </div>
          <Select label="Payment" options={payOpts} value={form.payment_status} onChange={e=>setForm({...form,payment_status:e.target.value})} />
          <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Notes</label><textarea className="input-base min-h-[80px] resize-none" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} /></div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-dark-700">
          <Button variant="secondary" onClick={()=>{setShowModal(false);setEditing(null)}}>Cancel</Button>
          <Button onClick={handleSave} loading={saving}>{editing?'Update':'Create'} Booking</Button>
        </div>
      </Modal>

      <Modal isOpen={showDetail} onClose={()=>setShowDetail(false)} title="Booking Details" size="md">
        {selected&&<div className="space-y-4">
          <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-dark-700 rounded-xl">
            <div className={cn('w-14 h-14 rounded-full flex items-center justify-center text-white text-lg font-semibold',nameToColor(selected.customer_name))}>{getInitials(selected.customer_name)}</div>
            <div><h3 className="text-lg font-semibold text-gray-900 dark:text-white">{selected.customer_name}</h3><p className="text-sm text-gray-500">{formatPhone(selected.customer_phone)}</p></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><p className="text-xs text-gray-400 mb-1">Turf</p><p className="text-sm font-medium text-gray-900 dark:text-white">{selected.turfs?.name}</p></div>
            <div><p className="text-xs text-gray-400 mb-1">Date</p><p className="text-sm font-medium text-gray-900 dark:text-white">{getRelativeDateLabel(selected.booking_date)}</p></div>
            <div><p className="text-xs text-gray-400 mb-1">Time</p><p className="text-sm font-medium text-gray-900 dark:text-white">{formatTime12h(selected.start_time)} - {formatTime12h(selected.end_time)}</p></div>
            <div><p className="text-xs text-gray-400 mb-1">Amount</p><p className="text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(selected.total_amount)}</p></div>
            <div><p className="text-xs text-gray-400 mb-1">Status</p><Badge color={BOOKING_STATUS_COLORS[selected.booking_status]}>{BOOKING_STATUS_LABELS[selected.booking_status]}</Badge></div>
            <div><p className="text-xs text-gray-400 mb-1">Payment</p><Badge color={PAYMENT_STATUS_COLORS[selected.payment_status]}>{PAYMENT_STATUS_LABELS[selected.payment_status]}</Badge></div>
          </div>
          {selected.notes&&<div><p className="text-xs text-gray-400 mb-1">Notes</p><p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-dark-700 rounded-lg p-3">{selected.notes}</p></div>}
          <div className="pt-4 mt-2 border-t border-gray-100 dark:border-dark-700">
            <a href={getBookingConfirmationLink(selected)} target="_blank" rel="noopener noreferrer" className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-xl transition-colors">
              <MessageCircle className="w-4 h-4" /> Message Customer on WhatsApp
            </a>
          </div>
        </div>}
      </Modal>
    </div>
  )
}
