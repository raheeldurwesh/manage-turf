import { useState } from 'react'
import { User, Mail, Phone, Moon, Sun, Bell, MessageCircle, Shield, Save } from 'lucide-react'
import Card, { CardContent } from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useToast } from '../context/ToastContext'
import { cn } from '../utils/helpers'

export default function Settings() {
  const { profile, updateProfile } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    full_name: profile?.full_name || '',
    phone: profile?.phone || '',
    email: profile?.email || '',
  })

  const handleSave = async () => {
    setSaving(true)
    await updateProfile(form)
    setSaving(false)
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <h1 className="text-xl font-bold text-gray-900 dark:text-white">Settings</h1>

      {/* Profile */}
      <Card hover={false}>
        <CardContent>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><User className="w-5 h-5" />Profile</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Full Name" icon={User} value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} />
            <Input label="Phone" icon={Phone} value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
            <Input label="Email" icon={Mail} value={form.email} disabled className="opacity-60" />
          </div>
          <div className="mt-4"><Button onClick={handleSave} loading={saving} icon={Save} size="sm">Save Changes</Button></div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card hover={false}>
        <CardContent>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">{isDark ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}Appearance</h3>
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-700 rounded-xl">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Dark Mode</p>
              <p className="text-xs text-gray-500">Toggle between light and dark themes</p>
            </div>
            <button onClick={toggleTheme} className={cn('relative w-12 h-7 rounded-full transition-colors', isDark ? 'bg-primary-600' : 'bg-gray-300')}>
              <div className={cn('absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform', isDark ? 'translate-x-5.5 left-0.5' : 'left-0.5')} />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* WhatsApp */}
      <Card hover={false}>
        <CardContent>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><MessageCircle className="w-5 h-5" />WhatsApp Integration</h3>
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
            <p className="text-sm text-amber-800 dark:text-amber-300">WhatsApp notifications are configured via Supabase Edge Functions. Set your WhatsApp API credentials in the Supabase dashboard under Edge Function environment variables.</p>
          </div>
          <div className="mt-4 space-y-3">
            {['Booking Confirmed', 'Booking Cancelled', 'Payment Received', 'Booking Reminder'].map((t, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-700 rounded-xl">
                <span className="text-sm text-gray-700 dark:text-gray-300">{t}</span>
                <div className="w-10 h-6 bg-primary-600 rounded-full relative cursor-pointer"><div className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-white shadow" /></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card hover={false}>
        <CardContent>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><Shield className="w-5 h-5" />Security</h3>
          <p className="text-sm text-gray-500 mb-3">Password and authentication are managed through Supabase Auth.</p>
          <Button variant="secondary" size="sm" onClick={() => toast.info('Use Supabase dashboard to change password')}>Change Password</Button>
        </CardContent>
      </Card>
    </div>
  )
}
