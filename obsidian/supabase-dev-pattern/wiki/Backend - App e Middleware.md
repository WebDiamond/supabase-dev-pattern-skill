---
tags: [backend, express, middleware, sicurezza]
---

# Backend — App Express e Middleware

> Codice sorgente: [[Express App]]

## Ordine dei Middleware (IMPORTANTE)

```javascript
// ⚠️ 1. Stripe webhook PRIMA di express.json() — richiede raw body
app.use('/payments', paymentsRouter)

// 2. Headers di sicurezza HTTP
app.use(helmet({ contentSecurityPolicy: true, hsts: { maxAge: 31536000 } }))

// 3. CORS — whitelist domini
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') ?? ['http://localhost:5173'] }))

// 4. Rate limiting globale: 100 req / 15 min
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }))

// 4b. Rate limiting stretto su auth: 10 req / 15 min
app.use('/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 10 }))

// 5. Body parser con limite 10kb
app.use(express.json({ limit: '10kb' }))

// 6. Sanitizzazione XSS su body, query, params
app.use(sanitizeRequest)

// 7. Logging HTTP
app.use(morgan('combined'))

// 8. Audit log su endpoint sensibili
app.use('/auth',  auditLog)
app.use('/admin', auditLog)
```

## Error Handler Globale

```javascript
app.use((err, req, res, next) => {
  const status  = err.status ?? 500
  const message = process.env.NODE_ENV === 'production'
    ? 'Errore interno del server'  // mai esporre stack trace!
    : err.message
  res.status(status).json({ error: message })
})
```

## Variabili d'Ambiente Necessarie

| Variabile | Dove usata |
|---|---|
| `ALLOWED_ORIGINS` | CORS whitelist (comma-separated) |
| `SUPABASE_URL` | Client Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Operazioni admin DB |
| `STRIPE_SECRET_KEY` | Stripe API |
| `STRIPE_WEBHOOK_SECRET` | Verifica firma webhook |
| `NODE_ENV` | Modalità error handler |

## Note Correlate

- [[Express App]] — codice sorgente completo
- [[Backend - Auth Middleware]] — requireAuth, requireRole
- [[Auth - Panoramica]] — flusso JWT end-to-end
- [[Sicurezza - Checklist]] — lista completa controlli di sicurezza
