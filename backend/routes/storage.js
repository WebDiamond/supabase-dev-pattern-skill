/**
 * storage.js — Route Express per AWS S3
 *
 * Espone endpoint per upload (presigned URL o diretto),
 * download sicuro, lista file e cancellazione.
 * Tutte le route richiedono autenticazione JWT.
 */

import express         from 'express'
import multer          from 'multer'
import { requireAuth } from '../middleware/auth.js'
import {
  uploadToS3,
  getPresignedUploadUrl,
  getPresignedDownloadUrl,
  deleteFromS3,
  listUserFiles,
  getFileMetadata,
} from '../services/s3Service.js'

const router = express.Router()

// Multer in memoria — max 20MB
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 20 * 1024 * 1024 },
})

// ── Pattern 1: Upload diretto via backend (file piccoli) ──────────────────

/**
 * POST /storage/upload
 * Carica un file tramite backend → S3.
 * Restituisce la chiave S3.
 */
router.post('/upload', requireAuth, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nessun file ricevuto' })

  const { category = 'uploads' } = req.body

  try {
    const result = await uploadToS3({
      buffer:       req.file.buffer,
      mimeType:     req.file.mimetype,
      originalName: req.file.originalname,
      userId:       req.user.id,
      category,
    })
    res.json(result)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// ── Pattern 2: Presigned upload URL (file grandi, upload diretto S3) ──────

/**
 * POST /storage/presigned-upload
 * Genera un URL firmato per upload diretto da client a S3.
 * Il file non passa per il backend — ideale per file grandi.
 *
 * Body: { mimeType, originalName, category }
 * Risposta: { uploadUrl, key, expiresAt }
 *
 * Flusso client:
 *   1. Chiama questo endpoint per ottenere uploadUrl e key
 *   2. PUT al uploadUrl con il file (fetch/axios direttamente su S3)
 *   3. Salva key nel DB per recuperare il file in futuro
 */
router.post('/presigned-upload', requireAuth, async (req, res) => {
  const { mimeType, originalName, category = 'uploads' } = req.body

  if (!mimeType || !originalName) {
    return res.status(400).json({ error: 'mimeType e originalName obbligatori' })
  }

  try {
    const result = await getPresignedUploadUrl({
      userId: req.user.id, mimeType, originalName, category,
    })
    res.json(result)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// ── Download sicuro tramite presigned URL ─────────────────────────────────

/**
 * POST /storage/presigned-download
 * Genera URL firmato per download sicuro.
 * Verifica che la chiave appartenga all'utente.
 *
 * Body: { key, filename?, forceDownload? }
 * Risposta: { downloadUrl, expiresAt }
 */
router.post('/presigned-download', requireAuth, async (req, res) => {
  const { key, filename, forceDownload = false } = req.body

  if (!key) return res.status(400).json({ error: 'key obbligatorio' })

  // Sicurezza: verifica ownership del file
  if (!key.startsWith(`${req.user.id}/`)) {
    return res.status(403).json({ error: 'Accesso negato' })
  }

  try {
    const result = await getPresignedDownloadUrl({ key, filename, forceDownload })
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── Lista file utente ─────────────────────────────────────────────────────

/**
 * GET /storage/files?category=uploads
 * Lista i file dell'utente corrente in una categoria.
 */
router.get('/files', requireAuth, async (req, res) => {
  const { category = '' } = req.query

  try {
    const files = await listUserFiles(req.user.id, category)
    res.json({ files })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * GET /storage/metadata?key=userId/category/file.pdf
 * Metadati di un file senza scaricarlo.
 */
router.get('/metadata', requireAuth, async (req, res) => {
  const { key } = req.query
  if (!key) return res.status(400).json({ error: 'key obbligatorio' })

  if (!key.startsWith(`${req.user.id}/`)) {
    return res.status(403).json({ error: 'Accesso negato' })
  }

  try {
    const meta = await getFileMetadata(key)
    res.json(meta)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── Eliminazione ──────────────────────────────────────────────────────────

/**
 * DELETE /storage/file
 * Elimina un file. Verifica ownership server-side.
 *
 * Body: { key }
 */
router.delete('/file', requireAuth, async (req, res) => {
  const { key } = req.body
  if (!key) return res.status(400).json({ error: 'key obbligatorio' })

  try {
    await deleteFromS3(key, req.user.id)
    res.status(204).end()
  } catch (err) {
    const status = err.message.includes('Accesso negato') ? 403 : 500
    res.status(status).json({ error: err.message })
  }
})

export default router
