// src/routes/auth.js
import express              from 'express'
import { body, validationResult } from 'express-validator'
import supabase             from '../lib/supabase.js'

const router = express.Router()

/**
 * POST /auth/otp/send
 * Invia codice OTP al numero di telefono tramite Supabase Auth (Twilio/Vonage)
 */
router.post('/otp/send',
  [body('phone').isMobilePhone().withMessage('Numero di telefono non valido')],
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

    const phone = req.body.phone.replace(/[^\d+]/g, '')
    const { error } = await supabase.auth.signInWithOtp({ phone })

    if (error) return res.status(400).json({ error: error.message })

    // Messaggio generico — non rivela se il numero esiste
    res.json({ message: 'Se il numero è valido, riceverai un codice SMS' })
  }
)

/**
 * POST /auth/otp/verify
 * Verifica codice OTP SMS — restituisce session JWT
 */
router.post('/otp/verify',
  [
    body('phone').isMobilePhone(),
    body('token').isLength({ min: 6, max: 6 }).isNumeric(),
  ],
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

    const phone = req.body.phone.replace(/[^\d+]/g, '')

    const { data, error } = await supabase.auth.verifyOtp({
      phone,
      token: req.body.token,
      type:  'sms',
    })

    if (error) return res.status(401).json({ error: 'Codice non valido o scaduto' })

    res.json({
      access_token:  data.session.access_token,
      refresh_token: data.session.refresh_token,
      user:          data.user,
    })
  }
)

export default router
