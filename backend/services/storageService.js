// src/services/storageService.js
import supabase from '../lib/supabase.js'
import { randomUUID } from 'crypto'
import path           from 'path'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE      = 2 * 1024 * 1024 // 2MB

export async function uploadAvatar(fileBuffer, originalName, mimeType, userId) {
  if (!ALLOWED_TYPES.includes(mimeType)) throw new Error('Tipo file non supportato')
  if (fileBuffer.length > MAX_SIZE)      throw new Error('File troppo grande (max 2MB)')

  const ext      = path.extname(originalName)
  const fileName = `${userId}/${randomUUID()}${ext}`

  const { error } = await supabase.storage
    .from('avatars').upload(fileName, fileBuffer, { contentType: mimeType, upsert: true })
  if (error) throw new Error(error.message)

  const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName, {
    transform: { width: 200, height: 200, resize: 'cover', format: 'webp' },
  })
  return publicUrl
}

export async function getSignedUrl(bucket, fileName, expiresIn = 3600) {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(fileName, expiresIn)
  if (error) throw new Error(error.message)
  return data.signedUrl
}

export async function deleteFile(bucket, fileName) {
  const { error } = await supabase.storage.from(bucket).remove([fileName])
  if (error) throw new Error(error.message)
}
