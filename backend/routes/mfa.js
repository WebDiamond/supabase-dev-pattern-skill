// src/routes/mfa.js — 2FA TOTP (Google Authenticator, Authy)
import express            from 'express'
import { createClient }   from '@supabase/supabase-js'
import { requireAuth }    from '../middleware/auth.js'

const router = express.Router()

// Per MFA usare il client con il token utente (non service role)
const userClient = (authHeader) => createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  { global: { headers: { Authorization: authHeader } } }
)

/** POST /mfa/enroll — avvia enrollment, restituisce QR code e secret */
router.post('/enroll', requireAuth, async (req, res) => {
  const { data, error } = await userClient(req.headers['authorization'])
    .auth.mfa.enroll({
      factorType:   'totp',
      friendlyName: `Dispositivo ${new Date().toLocaleDateString('it-IT')}`,
    })

  if (error) return res.status(400).json({ error: error.message })

  res.json({
    factor_id: data.id,
    qr_code:   data.totp.qr_code,  // immagine base64 — mostrare al frontend
    secret:    data.totp.secret,    // per inserimento manuale nell'app
  })
})

/** POST /mfa/verify — verifica codice TOTP e completa enrollment */
router.post('/verify', requireAuth, async (req, res) => {
  const { factor_id, code } = req.body
  if (!factor_id || !code)
    return res.status(400).json({ error: 'factor_id e code obbligatori' })

  const { data, error } = await userClient(req.headers['authorization'])
    .auth.mfa.challengeAndVerify({ factorId: factor_id, code })

  if (error) return res.status(401).json({ error: 'Codice non valido' })
  res.json({ verified: true, session: data })
})

/** POST /mfa/unenroll — rimuove il fattore 2FA */
router.post('/unenroll', requireAuth, async (req, res) => {
  const { error } = await userClient(req.headers['authorization'])
    .auth.mfa.unenroll({ factorId: req.body.factor_id })

  if (error) return res.status(400).json({ error: error.message })
  res.json({ message: '2FA rimosso con successo' })
})

export default router
