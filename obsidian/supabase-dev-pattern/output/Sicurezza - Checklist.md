---
tags: [sicurezza, checklist, owasp, output]
---

# Sicurezza — Checklist

## Database

- [ ] RLS abilitato su **tutte** le tabelle — [[Database - RLS]]
- [ ] Tabelle Stripe senza policy di scrittura per client
- [ ] `SERVICE_ROLE_KEY` mai esposta lato client
- [ ] Trigger `updated_at` su tabelle che lo richiedono — [[Database - Schema]]
- [ ] Storage: policy che vincolano cartella all'`auth.uid()`

## Backend Express

- [ ] `helmet()` con CSP e HSTS — [[Backend - App e Middleware]]
- [ ] CORS con whitelist esplicita (non `*`)
- [ ] Rate limiting globale: 100 req / 15 min
- [ ] Rate limiting stretto su `/auth`: 10 req / 15 min
- [ ] `express.json({ limit: '10kb' })`
- [ ] Sanitizzazione XSS su body, query, params
- [ ] Audit log su `/auth` e `/admin`
- [ ] Error handler: mai esporre stack trace in produzione

## Autenticazione

- [ ] JWT verificato con `supabase.auth.getUser(token)` — [[Backend - Auth Middleware]]
- [ ] Controllo ruolo con `requireRole()` dopo `requireAuth()`
- [ ] Messaggi di errore generici (no user enumeration)
- [ ] Normalizzazione email: `.trim().toLowerCase()`
- [ ] Normalizzazione telefono: `.replace(/[^\d+]/g, '')`

## Stripe / Pagamenti

- [ ] Firma webhook verificata con `constructWebhookEvent()` — [[Payments - Abbonamenti e Webhook]]
- [ ] Webhook montato **prima** di `express.json()` (raw body)
- [ ] Stato ordine aggiornato **solo via webhook**, mai dal success URL
- [ ] `metadata: { user_id }` su ogni oggetto Stripe

## Edge Functions

- [ ] Variabili sensibili in Supabase Secrets (non hardcoded)
- [ ] `SERVICE_ROLE_KEY` usata solo dove serve bypass RLS
- [ ] Verifica firma webhook prima di processare eventi

## Mobile

- [ ] `AsyncStorage` per persistere sessione
- [ ] `detectSessionInUrl: false` nel client mobile
- [ ] OAuth con `skipBrowserRedirect: true` e scambio codice manuale
- [ ] `EXPO_PUBLIC_` solo per dati non sensibili

## Realtime

- [ ] `ANON_KEY` per subscriptions Realtime (non service role)
- [ ] Cleanup canali nei `useEffect`

---

## OWASP Top 10 — Copertura

| Vulnerabilità | Mitigazione |
|---|---|
| Injection | Sanitizzazione input + query parametrizzate Supabase |
| Broken Auth | JWT verificato server-side, rate limiting auth |
| Sensitive Data | Stack trace nascosto, messaggi generici |
| Broken Access | RLS + requireRole + verifica proprietà risorsa |
| Security Misconfiguration | Helmet, CORS whitelist |
| XSS | Sanitizzazione body/query/params |
| Insecure Deserialization | Limit body 10kb |
| Logging & Monitoring | Audit log su endpoint sensibili |
