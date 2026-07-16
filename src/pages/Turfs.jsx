import { useState, useEffect } from 'react'
import { Plus, MapPin, Pencil, Trash2, Clock, Wallet, Star, ToggleLeft, ToggleRight, Image } from 'lucide-react'
import Card, { CardContent } from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Modal from '../components/ui/Modal'
import EmptyState from '../components/ui/EmptyState'
import { SkeletonCard } from '../components/ui/Skeleton'
import { getTurfs, createTurf, updateTurf, deleteTurf, uploadTurfImage } from '../services/turfService'
import { SPORT_TYPES, AMENITIES, generateTimeSlots } from '../utils/constants'
import { formatCurrency, cn, formatTime12h } from '../utils/helpers'
import { useToast } from '../context/ToastContext'

const INIT = { name:'', description:'', sport_type:'cricket', price_per_hour:1000, location:'', opening_time:'06:00', closing_time:'23:00', amenities:[], images:[], is_active:true }

export default function Turfs() {
  const { toast } = useToast()
  const [turfs, setTurfs] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(INIT)
  const [saving, setSaving] = useState(false)
  const timeSlots = generateTimeSlots()

  const fetchTurfs = async () => {
    setLoading(true)
    const { data } = await getTurfs()
    setTurfs(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchTurfs() }, [])

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Turf name required'); return }
    setSaving(true)
    const result = editing
      ? await updateTurf(editing.id, form)
      : await createTurf(form)
    if (result.error) toast.error(result.error.message || 'Failed')
    else { toast.success(editing ? 'Updated!' : 'Created!'); setShowModal(false); setEditing(null); setForm(INIT); fetchTurfs() }
    setSaving(false)
  }

  const handleDelete = async (turf) => {
    if (!confirm(`Delete "${turf.name}"? This cannot be undone.`)) return
    const { error } = await deleteTurf(turf.id)
    if (error) toast.error('Cannot delete turf with bookings')
    else { toast.success('Turf deleted'); fetchTurfs() }
  }

  const toggleAmenity = (a) => {
    setForm(prev => ({
      ...prev,
      amenities: prev.amenities.includes(a) ? prev.amenities.filter(x => x !== a) : [...prev.amenities, a]
    }))
  }

  const [uploadingImage, setUploadingImage] = useState(false)

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setUploadingImage(true)
    const turfId = editing?.id || 'temp_' + Date.now()
    const { url, error } = await uploadTurfImage(file, turfId)
    
    if (error) {
      toast.error(error.message || 'Image upload failed. Ensure "turf-images" storage bucket exists in Supabase.')
    } else if (url) {
      setForm(prev => ({
        ...prev,
        images: [...prev.images, url]
      }))
      toast.success('Image uploaded successfully!')
    }
    setUploadingImage(false)
  }

  const removeImage = (indexToRemove) => {
    setForm(prev => ({
      ...prev,
      images: prev.images.filter((_, idx) => idx !== indexToRemove)
    }))
  }

  const openEdit = (t) => {
    setEditing(t)
    setForm({ name:t.name, description:t.description||'', sport_type:t.sport_type||'cricket', price_per_hour:t.price_per_hour, location:t.location||'', opening_time:t.opening_time||'06:00', closing_time:t.closing_time||'23:00', amenities:t.amenities||[], images:t.images||[], is_active:t.is_active })
    setShowModal(true)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><h1 className="text-xl font-bold text-gray-900 dark:text-white">Turfs</h1><p className="text-sm text-gray-500">{turfs.length} turfs</p></div>
        <Button onClick={() => { setEditing(null); setForm(INIT); setShowModal(true) }} icon={Plus}>Add Turf</Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{Array.from({length:3}).map((_,i)=><SkeletonCard key={i} />)}</div>
      ) : turfs.length === 0 ? (
        <EmptyState icon={MapPin} title="No turfs yet" description="Add your first turf to get started." actionLabel="Add Turf" onAction={() => { setForm(INIT); setShowModal(true) }} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {turfs.map(turf => (
            <Card key={turf.id} className="overflow-hidden">
              {/* Image Header */}
              <div className={cn('h-36 flex items-center justify-center relative bg-gray-100 dark:bg-dark-800',
                turf.images?.length ? '' : 'gradient-primary'
              )}>
                {turf.images?.length ? (
                  <img src={turf.images[0]} alt={turf.name} className="w-full h-full object-cover" />
                ) : (
                  <MapPin className="w-12 h-12 text-white/60" />
                )}
                <div className="absolute top-3 right-3">
                  <Badge color={turf.is_active ? 'green' : 'gray'}>{turf.is_active ? 'Active' : 'Inactive'}</Badge>
                </div>
                <div className="absolute top-3 left-3">
                  <Badge color="purple">{SPORT_TYPES.find(s=>s.value===turf.sport_type)?.label || turf.sport_type}</Badge>
                </div>
              </div>

              <CardContent>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{turf.name}</h3>
                {turf.location && <p className="text-sm text-gray-500 flex items-center gap-1 mb-3"><MapPin className="w-3.5 h-3.5" />{turf.location}</p>}

                <div className="flex items-center gap-4 mb-4 text-sm text-gray-600 dark:text-gray-400">
                  <span className="flex items-center gap-1"><Wallet className="w-3.5 h-3.5" />{formatCurrency(turf.price_per_hour)}/hr</span>
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{formatTime12h(turf.opening_time)}-{formatTime12h(turf.closing_time)}</span>
                </div>

                {turf.amenities?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {turf.amenities.slice(0, 4).map(a => <span key={a} className="text-[10px] px-2 py-0.5 bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-400 rounded-full">{a}</span>)}
                    {turf.amenities.length > 4 && <span className="text-[10px] text-gray-400">+{turf.amenities.length-4}</span>}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" icon={Pencil} onClick={() => openEdit(turf)} className="flex-1">Edit</Button>
                  <Button variant="ghost" size="sm" icon={Trash2} onClick={() => handleDelete(turf)} className="text-red-500 hover:text-red-600" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setEditing(null) }} title={editing ? 'Edit Turf' : 'Add Turf'} size="lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Turf Name *" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Main Ground" />
          <Select label="Sport Type" options={SPORT_TYPES} value={form.sport_type} onChange={e => setForm({...form, sport_type: e.target.value})} />
          <Input label="Price Per Hour (₹) *" type="number" icon={Wallet} value={form.price_per_hour} onChange={e => setForm({...form, price_per_hour: Number(e.target.value)})} />
          <Input label="Location" icon={MapPin} value={form.location} onChange={e => setForm({...form, location: e.target.value})} placeholder="City, Area" />
          <Select label="Opening Time" options={timeSlots} value={form.opening_time} onChange={e => setForm({...form, opening_time: e.target.value})} />
          <Select label="Closing Time" options={timeSlots} value={form.closing_time} onChange={e => setForm({...form, closing_time: e.target.value})} />
          
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Description</label>
            <textarea className="input-base min-h-[80px] resize-none" value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Describe the turf..." />
          </div>

          {/* Image Upload section */}
          <div className="md:col-span-2 space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Turf Images</label>
            <div className="flex flex-wrap gap-3 items-center">
              {form.images?.map((url, idx) => (
                <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-200 dark:border-dark-700">
                  <img src={url} alt="preview" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removeImage(idx)} className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <label className={cn(
                "w-20 h-20 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-dark-600 rounded-xl cursor-pointer hover:border-primary-500 transition-colors",
                uploadingImage && "opacity-50 pointer-events-none"
              )}>
                <Image className="w-6 h-6 text-gray-400" />
                <span className="text-[10px] text-gray-400 mt-1">{uploadingImage ? 'Uploading...' : 'Upload'}</span>
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </label>
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Amenities</label>
            <div className="flex flex-wrap gap-2">
              {AMENITIES.map(a => (
                <button key={a} type="button" onClick={() => toggleAmenity(a)} className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-full border transition-all',
                  form.amenities.includes(a)
                    ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-300 dark:border-primary-700 text-primary-700 dark:text-primary-400'
                    : 'bg-gray-50 dark:bg-dark-700 border-gray-200 dark:border-dark-600 text-gray-500'
                )}>{a}</button>
              ))}
            </div>
          </div>

          <div className="md:col-span-2 flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-700 rounded-xl">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Active Status</span>
            <button type="button" onClick={() => setForm({...form, is_active: !form.is_active})}>
              {form.is_active ? <ToggleRight className="w-8 h-8 text-primary-600" /> : <ToggleLeft className="w-8 h-8 text-gray-400" />}
            </button>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-dark-700">
          <Button variant="secondary" onClick={() => { setShowModal(false); setEditing(null) }}>Cancel</Button>
          <Button onClick={handleSave} loading={saving}>{editing ? 'Update' : 'Add'} Turf</Button>
        </div>
      </Modal>
    </div>
  )
}
