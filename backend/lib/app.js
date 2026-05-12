// src/app.js — Express app con tutti i middleware di sicurezza
import express    from 'express'
import helmet     from 'helmet'
import cors       from 'cors'
import rateLimit  from 'express-rate-limit'
import morgan     from 'morgan'
import { sanitizeRequest } from './middleware/sanitize.js'
import { auditLog }        from './middleware/audit.js'
import paymentsRouter      from './routes/payments.js'
import authRouter          from './routes/auth.js'
import mfaRouter           from './routes/mfa.js'
import postsRouter         from './routes/posts.js'
import usersRouter         from './routes/users.js'

const app = express()

// ⚠️  Webhook Stripe PRIMA di express.json() — usa raw body
app.use('/payments', paymentsRouter)

// 1. Headers HTTP sicuri
app.use(helmet({
  contentSecurityPolicy: true,
  hsts: { maxAge: 31536000, includeSubDomains: true },
}))

// 2. CORS — whitelist domini autorizzati
app.use(cors({
  origin:         process.env.ALLOWED_ORIGINS?.split(',') ?? ['http://localhost:5173'],
  methods:        ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials:    true,
}))

// 3. Rate limiting globale
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      100,
  message:  { error: 'Troppe richieste, riprova tra 15 minuti' },
}))

// 4. Rate limiting più stretto su auth
app.use('/auth', rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      10,
  message:  { error: 'Troppi tentativi di autenticazione' },
}))

// 5. Body parser limitato
app.use(express.json({ limit: '10kb' }))
app.use(express.urlencoded({ extended: true, limit: '10kb' }))

// 6. Sanitizzazione input
app.use(sanitizeRequest)

// 7. HTTP request logging
app.use(morgan('combined'))

// 8. Audit log su route sensibili
app.use('/auth',  auditLog)
app.use('/admin', auditLog)

// Route
app.use('/auth',  authRouter)
app.use('/mfa',   mfaRouter)
app.use('/posts', postsRouter)
app.use('/users', usersRouter)

// Error handler globale — mai esporre stack trace in produzione
app.use((err, req, res, next) => {
  const status  = err.status ?? 500
  const message = process.env.NODE_ENV === 'production'
    ? 'Errore interno del server'
    : err.message
  res.status(status).json({ error: message })
})

export default app
