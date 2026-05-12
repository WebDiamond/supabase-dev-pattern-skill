---
tags: [architettura, overview]
---

# Architettura del Sistema

## Stack Tecnologico

| Layer | Tecnologia |
|---|---|
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (JWT) |
| Storage | Supabase Storage |
| Backend API | Node.js + Express |
| Frontend Web | React + TypeScript + Zustand |
| Mobile | React Native + Expo |
| Pagamenti | Stripe |
| Edge Functions | Deno (Supabase Functions) |

## Flusso delle Richieste

```
Client (Web/Mobile)
  │
  ├─→ Supabase Auth  →  JWT token
  │
  ├─→ Backend Express (verifica JWT via requireAuth)
  │     ├─ GET /posts     → Service Role key → Supabase DB
  │     ├─ POST /payments → Stripe API → ordini su DB
  │     └─ POST /auth/otp → Supabase Auth
  │
  ├─→ Supabase DB direttamente (con JWT client)
  │     └─ RLS filtra automaticamente per auth.uid()
  │
  └─→ Supabase Edge Functions
        └─ stripe-webhook → aggiorna orders/subscriptions
```

## Regola d'Oro: Chi può fare cosa

| Operazione | Chi la esegue | Chiave usata |
|---|---|---|
| Lettura dati utente | Client diretto | `ANON_KEY` + JWT |
| Scrittura ordini/payments | Backend/Edge Function | `SERVICE_ROLE_KEY` |
| Realtime subscription | Backend worker | `ANON_KEY` |
| Webhook Stripe | Edge Function | `SERVICE_ROLE_KEY` |

> **Mai** esporre `SERVICE_ROLE_KEY` lato client. Bypassa ogni RLS.

## Layer di Sicurezza

1. **RLS** — filtro a livello database [[Database - RLS]]
2. **JWT middleware** — verifica token Express [[Backend - Auth Middleware]]
3. **Rate limiting** — 100 req/15min globale, 10 su /auth [[Backend - App e Middleware]]
4. **Sanitizzazione** — rimozione XSS da body/query/params [[Backend - App e Middleware]]
5. **Audit log** — traccia tutte le request su /auth e /admin [[Backend - App e Middleware]]

## Note Correlate

- [[Database - Schema]] — struttura delle tabelle
- [[Auth - Panoramica]] — tutti i metodi di autenticazione
- [[Payments - Stripe Overview]] — architettura dei pagamenti
- [[Edge Functions]] — funzioni serverless
