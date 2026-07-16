import { supabase } from './supabase'

/**
 * Fetch all turfs for the owner
 */
export const getTurfs = async () => {
  const { data, error } = await supabase
    .from('turfs')
    .select('*')
    .order('created_at', { ascending: false })

  return { data, error }
}

/**
 * Get a single turf by ID
 */
export const getTurfById = async (id) => {
  const { data, error } = await supabase
    .from('turfs')
    .select('*')
    .eq('id', id)
    .single()

  return { data, error }
}

/**
 * Create a new turf
 */
export const createTurf = async (turf) => {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('turfs')
    .insert({
      ...turf,
      owner_id: user.id,
    })
    .select()
    .single()

  return { data, error }
}

/**
 * Update a turf
 */
export const updateTurf = async (id, updates) => {
  const { data, error } = await supabase
    .from('turfs')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  return { data, error }
}

/**
 * Delete a turf
 */
export const deleteTurf = async (id) => {
  const { error } = await supabase
    .from('turfs')
    .delete()
    .eq('id', id)

  return { error }
}

/**
 * Upload turf image to Supabase Storage
 */
export const uploadTurfImage = async (file, turfId) => {
  const fileExt = file.name.split('.').pop()
  const fileName = `${turfId}/${Date.now()}.${fileExt}`

  const { data, error } = await supabase.storage
    .from('turf-images')
    .upload(fileName, file, { upsert: true })

  if (error) return { url: null, error }

  const { data: { publicUrl } } = supabase.storage
    .from('turf-images')
    .getPublicUrl(data.path)

  return { url: publicUrl, error: null }
}

/**
 * Get active turfs (for dropdowns)
 */
export const getActiveTurfs = async () => {
  const { data, error } = await supabase
    .from('turfs')
    .select('id, name, price_per_hour, opening_time, closing_time, sport_type')
    .eq('is_active', true)
    .order('name')

  return { data, error }
}
