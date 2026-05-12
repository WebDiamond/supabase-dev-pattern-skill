/**
 * s3Service.js — AWS S3 File Storage (Backend Node.js)
 *
 * Gestisce upload, download, eliminazione e URL presigned su AWS S3.
 * Tutta la logica S3 passa per il backend — il client (web/mobile) riceve
 * solo URL presigned temporanei, mai le credenziali AWS.
 *
 * Setup:
 *   npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
 *
 * Variabili d'ambiente richieste:
 *   AWS_REGION=eu-south-1
 *   AWS_ACCESS_KEY_ID=AKIA...
 *   AWS_SECRET_ACCESS_KEY=xxx
 *   AWS_S3_BUCKET=mio-bucket-nome
 *   AWS_S3_BUCKET_PUBLIC=mio-bucket-pubblico   (opzionale, per asset pubblici)
 *
 * Best practice sicurezza S3:
 *   ✅ Credenziali SOLO su backend (mai nel bundle client)
 *   ✅ Bucket privato di default (Block Public Access = ON)
 *   ✅ URL presigned con scadenza breve (default 15 min)
 *   ✅ Validazione MIME type e dimensione server-side prima dell'upload
 *   ✅ Path strutturati: userId/category/uuid.ext (previene path traversal)
 *   ✅ ServerSideEncryption AES-256 su ogni upload
 *   ✅ ContentDisposition per download sicuro (non inline)
 *   ✅ Versioning abilitato sul bucket (rollback in caso di errore)
 *   ✅ IAM policy minimal: solo s3:PutObject, s3:GetObject, s3:DeleteObject
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  CopyObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl }   from '@aws-sdk/s3-request-presigner'
import { randomUUID }     from 'crypto'
import path               from 'path'
import logger             from '../lib/logger.js'

// ── Client S3 ──────────────────────────────────────────────────────────────

const s3 = new S3Client({
  region:      process.env.AWS_REGION ?? 'eu-south-1',
  credentials: {
    accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
})

const BUCKET         = process.env.AWS_S3_BUCKET
const BUCKET_PUBLIC  = process.env.AWS_S3_BUCKET_PUBLIC ?? BUCKET

// ── Validatori ────────────────────────────────────────────────────────────

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const ALLOWED_DOC_TYPES   = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/csv',
]
const ALLOWED_ALL = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOC_TYPES]

const SIZE_LIMITS = {
  image:    5  * 1024 * 1024,   // 5MB
  document: 20 * 1024 * 1024,   // 20MB
  default:  10 * 1024 * 1024,   // 10MB
}

export function validateS3File(mimeType, sizeBytes, category = 'default') {
  if (!ALLOWED_ALL.includes(mimeType)) {
    throw new Error(`Tipo file non consentito: ${mimeType}`)
  }
  const limit = SIZE_LIMITS[category] ?? SIZE_LIMITS.default
  if (sizeBytes > limit) {
    throw new Error(`File troppo grande: max ${limit / 1024 / 1024}MB per ${category}`)
  }
}

/** Costruisce un path S3 sicuro — previene path traversal */
function buildS3Key(userId, category, originalName) {
  const ext     = path.extname(originalName).toLowerCase().replace(/[^a-z0-9.]/g, '')
  const safeName = `${randomUUID()}${ext}`
  return `${userId}/${category}/${safeName}`
}

// ── Upload ────────────────────────────────────────────────────────────────

/**
 * Carica un buffer direttamente su S3.
 * Usato per file già in memoria (es. da Multer memoryStorage).
 * Restituisce la chiave S3 (non l'URL — per URL usa getPresignedDownloadUrl).
 */
export async function uploadToS3({
  buffer,
  mimeType,
  originalName,
  userId,
  category = 'uploads',
  isPublic  = false,
}) {
  validateS3File(mimeType, buffer.length, ALLOWED_IMAGE_TYPES.includes(mimeType) ? 'image' : 'document')

  const key    = buildS3Key(userId, category, originalName)
  const bucket = isPublic ? BUCKET_PUBLIC : BUCKET

  await s3.send(new PutObjectCommand({
    Bucket:               bucket,
    Key:                  key,
    Body:                 buffer,
    ContentType:          mimeType,
    // Sicurezza: crittografia lato server
    ServerSideEncryption: 'AES256',
    // Impedisce esecuzione di file JS caricati come HTML
    ContentDisposition:   `attachment; filename="${path.basename(key)}"`,
    // Tag per lifecycle rules e cost allocation
    Tagging:              `userId=${userId}&category=${category}`,
    // ACL: private di default (mai 'public-read' a meno che non sia asset pubblico)
    ...(isPublic ? {} : {}),
  }))

  logger.info('S3 upload', { key, userId, category, size: buffer.length })

  return { key, bucket }
}

/**
 * Genera un URL presigned per upload diretto dal client.
 * Il client carica direttamente su S3 senza passare per il backend.
 * Sicuro perché: URL scade (default 15 min), validazione MIME è nel URL.
 */
export async function getPresignedUploadUrl({
  userId,
  category     = 'uploads',
  mimeType,
  originalName,
  expiresIn    = 900,   // 15 minuti
}) {
  if (!ALLOWED_ALL.includes(mimeType)) {
    throw new Error(`Tipo file non consentito: ${mimeType}`)
  }

  const key = buildS3Key(userId, category, originalName)

  const command = new PutObjectCommand({
    Bucket:               BUCKET,
    Key:                  key,
    ContentType:          mimeType,
    ServerSideEncryption: 'AES256',
    ContentDisposition:   `attachment; filename="${path.basename(key)}"`,
    Tagging:              `userId=${userId}&category=${category}`,
  })

  const url = await getSignedUrl(s3, command, { expiresIn })

  logger.info('S3 presigned upload URL generato', { key, userId, expiresIn })

  return { uploadUrl: url, key, expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString() }
}

// ── Download / accesso ────────────────────────────────────────────────────

/**
 * Genera URL presigned per download sicuro.
 * Il client scarica direttamente da S3 senza passare per il backend.
 */
export async function getPresignedDownloadUrl({
  key,
  expiresIn       = 900,   // 15 minuti
  bucket          = BUCKET,
  forceDownload   = false,
  filename,
}) {
  const command = new GetObjectCommand({
    Bucket:              bucket,
    Key:                 key,
    ...(forceDownload && {
      ResponseContentDisposition: `attachment; filename="${filename ?? path.basename(key)}"`,
    }),
  })

  const url = await getSignedUrl(s3, command, { expiresIn })

  return { downloadUrl: url, expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString() }
}

/**
 * Ottieni metadati di un file senza scaricarlo.
 * Utile per verificare esistenza e dimensione.
 */
export async function getFileMetadata(key, bucket = BUCKET) {
  try {
    const result = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }))
    return {
      exists:        true,
      size:          result.ContentLength,
      mimeType:      result.ContentType,
      lastModified:  result.LastModified,
      etag:          result.ETag,
    }
  } catch (err) {
    if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
      return { exists: false }
    }
    throw err
  }
}

// ── Eliminazione ──────────────────────────────────────────────────────────

/**
 * Elimina un file da S3. Verifica che la chiave appartenga all'utente.
 */
export async function deleteFromS3(key, userId, bucket = BUCKET) {
  // Sicurezza: verifica che il path inizi con userId/
  if (!key.startsWith(`${userId}/`)) {
    throw new Error('Accesso negato: il file non appartiene a questo utente')
  }

  await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
  logger.info('S3 delete', { key, userId })
}

// ── Listaggio ─────────────────────────────────────────────────────────────

/**
 * Lista i file di un utente in una categoria.
 */
export async function listUserFiles(userId, category = '', bucket = BUCKET) {
  const prefix = category ? `${userId}/${category}/` : `${userId}/`

  const result = await s3.send(new ListObjectsV2Command({
    Bucket: bucket,
    Prefix: prefix,
    MaxKeys: 100,
  }))

  return (result.Contents ?? []).map(obj => ({
    key:          obj.Key,
    size:         obj.Size,
    lastModified: obj.LastModified,
    name:         path.basename(obj.Key),
  }))
}

// ── Copia ─────────────────────────────────────────────────────────────────

/**
 * Copia un file da una posizione a un'altra (es. da temp a permanente).
 */
export async function copyS3File(sourceKey, destKey, bucket = BUCKET) {
  await s3.send(new CopyObjectCommand({
    Bucket:               bucket,
    CopySource:           `${bucket}/${sourceKey}`,
    Key:                  destKey,
    ServerSideEncryption: 'AES256',
  }))

  return { key: destKey }
}
