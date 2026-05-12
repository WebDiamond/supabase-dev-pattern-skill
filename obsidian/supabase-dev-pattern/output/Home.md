---
tags: [moc, supabase, home]
---

# Supabase Dev Pattern — Mini Cervello

> Vault di riferimento per l'architettura full-stack Supabase + Express + React/Expo.

## Struttura del Vault

```
raw/     → codice sorgente verbatim dai file del progetto
wiki/    → spiegazioni concettuali, architettura, pattern
output/  → contenuto azionabile: checklist, guide, riferimenti rapidi
```

---

## wiki/ — Concetti e Architettura

### Fondamenta
- [[Architettura]] — visione d'insieme, flusso richieste, regole chiave
- [[Database - Schema]] — tabelle, tipi, trigger, realtime
- [[Database - RLS]] — Row Level Security policies, regola d'oro client/backend

### Autenticazione
- [[Auth - Panoramica]] — tabella comparativa tutti i metodi, flusso JWT
- [[Auth - Email Password]] — signup, signin, reset, normalizzazione
- [[Auth - OAuth e Magic Link]] — Google/GitHub/Apple, differenze web vs mobile
- [[Auth - OTP SMS e MFA TOTP]] — SMS OTP, TOTP 2FA enrollment e verifica

### Backend (Express)
- [[Backend - App e Middleware]] — ordine middleware, sanitizzazione, audit log
- [[Backend - Auth Middleware]] — requireAuth, requireRole, ownership check

### Pagamenti (Stripe)
- [[Payments - Stripe Overview]] — architettura con diagramma flusso
- [[Payments - Checkout e Intent]] — Checkout Session vs PaymentIntent, portale
- [[Payments - Abbonamenti e Webhook]] — verifica firma, gestione eventi, ciclo vita

### Frontend e Mobile
- [[Frontend Web - Auth]] — Zustand store, listener sessione, ProtectedRoute
- [[Mobile - Auth e OAuth]] — client AsyncStorage, PKCE Expo, authFetch

### Infrastruttura
- [[Edge Functions]] — Deno, deploy, import URL, confronto con Express
- [[Realtime]] — postgres_changes, worker server-side, listener client

---

## raw/ — Codice Sorgente

| File | Sorgente |
|---|---|
| [[Schema SQL]] | `shared/sql/schema.sql` |
| [[RLS SQL]] | `shared/sql/rls.sql` |
| [[Express App]] | `backend/lib/app.js` |
| [[Auth Middleware]] | `backend/middleware/auth.js` |
| [[Stripe Service]] | `backend/services/stripeService.js` |
| [[Stripe Webhook EF]] | `shared/edge-functions/stripe-webhook.ts` |
| [[Auth Service Web]] | `web/features/auth/authService.ts` |
| [[Auth Service Mobile]] | `mobile/src/features/auth/authService.ts` |
| [[Realtime Worker]] | `backend/workers/realtimeWorker.js` |

---

## output/ — Riferimenti Azionabili

- [[Sicurezza - Checklist]] — checklist completa + mappa OWASP Top 10
- [[Setup Guide]] — step-by-step per avviare un nuovo progetto da zero
- [[Quick Reference]] — tabelle compatte per consultazione rapida

---

## Pattern Chiave

| Concetto | Dove |
|---|---|
| JWT verificato server-side | [[Backend - Auth Middleware]] |
| Service Role Key solo backend | [[Database - RLS]] |
| Webhook Stripe su raw body | [[Payments - Abbonamenti e Webhook]] |
| OAuth mobile con PKCE | [[Mobile - Auth e OAuth]] |
| RLS impedisce accesso cross-user | [[Database - RLS]] |
| Stato ordine solo via webhook | [[Payments - Abbonamenti e Webhook]] |
