/**
 * s3Service.ts — Mobile (Expo)
 *
 * Gestisce upload e download file su AWS S3 tramite backend (presigned URL).
 * Supporta progress callback, upload da galleria/fotocamera e download in cache.
 */

import * as FileSystem from 'expo-file-system'
import { supabase }    from '../../lib/supabase'

const BACKEND = process.env.EXPO_PUBLIC_BACKEND_URL!

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

/**
 * Carica un file su S3 tramite presigned URL.
 * Supporta callback di progresso per mostrare barra di avanzamento.
 *
 * fileUri: URI locale del file (es. da expo-image-picker o expo-document-picker)
 */
export async function uploadFileToS3(
  fileUri:      string,
  mimeType:     string,
  fileName:     string,
  category:     string = 'uploads',
  onProgress?:  (pct: number) => void
): Promise<string> {
  // 1. Ottieni presigned URL dal backend
  const { uploadUrl, key } = await authFetch('/presigned-upload', {
    method: 'POST',
    body:   JSON.stringify({ mimeType, originalName: fileName, category }),
  })

  // 2. Carica direttamente su S3 tramite FileSystem.uploadAsync (supporta progress)
  const uploadResult = await FileSystem.uploadAsync(uploadUrl, fileUri, {
    httpMethod:  'PUT',
    uploadType:  FileSystem.FileSystemUploadType.BINARY_CONTENT,
    headers:     {
      'Content-Type': mimeType,
      // ⚠️ Non aggiungere Authorization su S3 — la firma è nel URL
    },
    sessionType: FileSystem.FileSystemSessionType.BACKGROUND,
  })

  if (uploadResult.status !== 200) {
    throw new Error(`Upload S3 fallito: ${uploadResult.status}`)
  }

  return key
}

// ── Download ──────────────────────────────────────────────────────────────

/**
 * Scarica un file da S3 nella cache locale dell'app.
 * Ritorna l'URI locale del file scaricato.
 */
export async function downloadFileFromS3(
  key:         string,
  fileName?:   string,
  onProgress?: (pct: number) => void
): Promise<string> {
  const { downloadUrl } = await authFetch('/presigned-download', {
    method: 'POST',
    body:   JSON.stringify({ key, filename: fileName }),
  })

  const localPath = `${FileSystem.cacheDirectory}${fileName ?? key.split('/').pop()}`

  const downloadResumable = FileSystem.createDownloadResumable(
    downloadUrl,
    localPath,
    {},
    (progress) => {
      if (onProgress && progress.totalBytesExpectedToWrite > 0) {
        const pct = Math.round(
          (progress.totalBytesWritten / progress.totalBytesExpectedToWrite) * 100
        )
        onProgress(pct)
      }
    }
  )

  const result = await downloadResumable.downloadAsync()
  if (!result) throw new Error('Download fallito')

  return result.uri
}

// ── Eliminazione e lista ──────────────────────────────────────────────────

export async function deleteS3File(key: string) {
  return authFetch('/file', {
    method: 'DELETE',
    body:   JSON.stringify({ key }),
  })
}

export async function listS3Files(category: string = '') {
  const params = category ? `?category=${encodeURIComponent(category)}` : ''
  return authFetch(`/files${params}`)
}
