---
tags: [raw, backend, express]
source: backend/lib/app.js
---

```javascript
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

app.use('/payments', paymentsRouter)

app.use(helmet({
  contentSecurityPolicy: true,
  hsts: { maxAge: 31536000, includeSubDomains: true },
}))

app.use(cors({
  origin:         process.env.ALLOWED_ORIGINS?.split(',') ?? ['http://localhost:5173'],
  methods:        ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials:    true,
}))

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      100,
  message:  { error: 'Troppe richieste, riprova tra 15 minuti' },
}))

app.use('/auth', rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      10,
  message:  { error: 'Troppi tentativi di autenticazione' },
}))

app.use(express.json({ limit: '10kb' }))
app.use(express.urlencoded({ extended: true, limit: '10kb' }))
app.use(sanitizeRequest)
app.use(morgan('combined'))
app.use('/auth',  auditLog)
app.use('/admin', auditLog)

app.use('/auth',  authRouter)
app.use('/mfa',   mfaRouter)
app.use('/posts', postsRouter)
app.use('/users', usersRouter)

app.use((err, req, res, next) => {
  const status  = err.status ?? 500
  const message = process.env.NODE_ENV === 'production'
    ? 'Errore interno del server'
    : err.message
  res.status(status).json({ error: message })
})

export default app
```

→ [[Backend - App e Middleware]] per la spiegazione
