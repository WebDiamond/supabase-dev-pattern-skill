// src/features/media/storageService.ts
import { supabase } from '../../lib/supabase'

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp']
const MAX_MB  = 5

export function validateFile(file: File) {
  if (!ALLOWED.includes(file.type))          throw new Error(`Tipo non supportato: ${file.type}`)
  if (file.size > MAX_MB * 1024 * 1024)     throw new Error(`File troppo grande (max ${MAX_MB}MB)`)
}

export async function uploadAvatar(file: File, userId: string): Promise<string> {
  validateFile(file)
  const path = `${userId}/${crypto.randomUUID()}.${file.name.split('.').pop()}`
  const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
  if (error) throw new Error(error.message)
  const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path, {
    transform: { width: 200, height: 200, resize: 'cover', format: 'webp' },
  })
  return publicUrl
}

export async function getSignedUrl(bucket: string, path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 3600)
  if (error) throw new Error(error.message)
  return data.signedUrl
}
