/**
 * s3Service.ts — Web (React)
 *
 * Gestisce upload e download file tramite il backend (presigned URL S3).
 * Il client non ha mai accesso diretto alle credenziali AWS.
 *
 * Pattern di upload (file grandi):
 *   1. POST /storage/presigned-upload → ottieni uploadUrl e key
 *   2. PUT uploadUrl con il file (diretto a S3, senza backend)
 *   3. Salva key nel tuo DB via Supabase
 *
 * Pattern di download:
 *   1. POST /storage/presigned-download con key → ottieni downloadUrl
 *   2. Usa downloadUrl per <a href> o fetch (scade in 15 min)
 */

import { supabase } from '../../lib/supabase'

const BACKEND = import.meta.env.VITE_BACKEND_URL ?? '/api'

async function authFetch(path: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Non autenticato')

  const res = await fetch(`${BACKEND}/storage${path}`, {
    ...options,
    headers: {
      'Content-Type':  'application/json',
      Authorization:   `Bearer ${session.access_token}`,
      ...options.headers,
    },
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Errore sconosciuto' }))
    throw new Error(err.error ?? 'Richiesta fallita')
  }

  return res.json()
}

// ── Upload ────────────────────────────────────────────────────────────────

export interface UploadResult {
  key:      string
  bucket:   string
}

export interface PresignedUploadResult {
  uploadUrl: string
  key:       string
  expiresAt: string
}

/**
 * Upload diretto via backend (file piccoli < 5MB).
 * Il file passa per il tuo server.
 */
export async function uploadFileDirect(
  file:     File,
  category: string = 'uploads',
  onProgress?: (pct: number) => void
): Promise<UploadResult> {
  const formData = new FormData()
  formData.append('file',     file)
  formData.append('category', category)

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Non autenticato')

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    if (onProgress) {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
      })
    }

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText))
      } else {
        reject(new Error(JSON.parse(xhr.responseText)?.error ?? 'Upload fallito'))
      }
    })

    xhr.addEventListener('error', () => reject(new Error('Errore di rete')))

    xhr.open('POST', `${BACKEND}/storage/upload`)
    xhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`)
    xhr.send(formData)
  })
}

/**
 * Upload con presigned URL — il file va direttamente a S3.
 * Ideale per file grandi (> 5MB) o per ridurre il carico sul backend.
 */
export async function uploadFilePresigned(
  file:     File,
  category: string = 'uploads',
  onProgress?: (pct: number) => void
): Promise<string> {
  // 1. Chiedi al backend il presigned URL
  const { uploadUrl, key } = await authFetch('/presigned-upload', {
    method: 'POST',
    body:   JSON.stringify({
      mimeType:     file.type,
      originalName: file.name,
      category,
    }),
  }) as PresignedUploadResult

  // 2. Carica direttamente su S3 con progress
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    if (onProgress) {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
      })
    }

    xhr.addEventListener('load', () => {
      xhr.status === 200 ? resolve() : reject(new Error(`S3 upload error: ${xhr.status}`))
    })
    xhr.addEventListener('error', () => reject(new Error('Errore di rete S3')))

    xhr.open('PUT', uploadUrl)
    xhr.setRequestHeader('Content-Type', file.type)
    // ⚠️ Non aggiungere Authorization su questa chiamata — è firmata nel URL
    xhr.send(file)
  })

  return key
}

// ── Download ──────────────────────────────────────────────────────────────

export interface DownloadUrlResult {
  downloadUrl: string
  expiresAt:   string
}

/**
 * Ottieni URL di download sicuro (scade in 15 min).
 */
export async function getDownloadUrl(
  key:           string,
  filename?:     string,
  forceDownload: boolean = false
): Promise<DownloadUrlResult> {
  return authFetch('/presigned-download', {
    method: 'POST',
    body:   JSON.stringify({ key, filename, forceDownload }),
  })
}

/**
 * Scarica e salva un file direttamente (trigger download browser).
 */
export async function downloadFile(key: string, filename?: string) {
  const { downloadUrl } = await getDownloadUrl(key, filename, true)
  const a   = document.createElement('a')
  a.href    = downloadUrl
  a.download = filename ?? key.split('/').pop() ?? 'file'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

// ── Lista e metadata ──────────────────────────────────────────────────────

export async function listFiles(category: string = '') {
  const params = category ? `?category=${encodeURIComponent(category)}` : ''
  return authFetch(`/files${params}`)
}

export async function getFileMetadata(key: string) {
  return authFetch(`/metadata?key=${encodeURIComponent(key)}`)
}

// ── Eliminazione ──────────────────────────────────────────────────────────

export async function deleteFile(key: string) {
  return authFetch('/file', {
    method: 'DELETE',
    body:   JSON.stringify({ key }),
  })
}
