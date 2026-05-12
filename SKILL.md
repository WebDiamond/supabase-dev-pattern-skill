---
name: supabase-dev-pattern
description: >
  Skill unificata per sviluppare con Supabase su tutti e tre i layer: backend Node.js/Express,
  web React.js (Vite + TypeScript) e mobile Expo (SDK 54+). Copre autenticazione completa
  (email/password, OAuth, OTP SMS, 2FA TOTP), database PostgreSQL con RLS, query tipizzate,
  realtime, storage, edge functions Deno, pagamenti Stripe (Checkout, Elements, abbonamenti,
  webhook), design system mobile UI/UX con dark mode e accessibilità, sicurezza per layer,
  e test (Jest/RNTL mobile, Vitest/Playwright web, Postman/Artillery backend).
  Usa questa skill ogni volta che si lavora con Supabase su qualsiasi piattaforma — anche
  per singoli argomenti come "come proteggo le route", "come gestisco la sessione",
  "come integro Stripe", "come faccio upload", "come testo le API", "come faccio il
  design system mobile", "come configuro il realtime" o "come scrivo le RLS policies".
---

# Supabase Dev Pattern — Guida Unificata Full-Stack

> Ogni sezione rimanda ai file sorgente nella cartella corrispondente.
> Leggi il file direttamente per il codice completo e i commenti inline.

---

## Struttura cartelle

```
supabase-dev-pattern/
├── SKILL.md                          ← questo file — indice navigabile
│
├── shared/                           ← Layer condiviso (tutti i layer)
│   ├── sql/
│   │   ├── schema.sql                ← Tabelle: profiles, posts, stripe_customers, orders, subscriptions
│   │   └── rls.sql                   ← RLS policies per tutte le tabelle + storage
│   └── edge-functions/
│       ├── send-email.ts             ← Email transazionale via Resend (Deno)
│       ├── send-otp-custom.ts        ← OTP SMS via provider custom (Deno)
│       └── stripe-webhook.ts         ← Webhook Stripe completo (Deno)
│
├── backend/                          ← Node.js + Express
│   ├── lib/
│   │   ├── supabase.js               ← Client con SERVICE_ROLE_KEY
│   │   ├── stripe.js                 ← Client Stripe
│   │   ├── logger.js                 ← Winston logger
│   │   └── app.js                    ← Express app + middleware di sicurezza
│   ├── middleware/
│   │   ├── auth.js                   ← requireAuth, requireRole
│   │   ├── sanitize.js               ← Sanitizzazione XSS/injection
│   │   └── audit.js                  ← Audit log su route sensibili
│   ├── routes/
│   │   ├── auth.js                   ← OTP SMS send/verify
│   │   ├── mfa.js                    ← 2FA TOTP enroll/verify/unenroll
│   │   ├── posts.js                  ← CRUD post con validazione
│   │   └── payments.js               ← Checkout, PaymentIntent, portale, webhook Stripe
│   ├── services/
│   │   ├── postService.js            ← Query DB post con paginazione
│   │   ├── storageService.js         ← Upload avatar, URL firmati, delete
│   │   └── stripeService.js          ← getOrCreateCustomer, checkout, portale, abbonamento
│   ├── validators/
│   │   └── postValidators.js         ← express-validator rules + validate middleware
│   ├── utils/
│   │   └── sanitize.js               ← sanitizePhone, sanitizePath
│   ├── workers/
│   │   └── realtimeWorker.js         ← Worker che ascolta eventi DB via WebSocket
│   └── tests/
│       ├── postman-collection.json   ← Collection importabile in Postman
│       └── artillery.yml             ← Load test: warm-up, sustained, spike
│
├── web/                              ← React.js + Vite + TypeScript
│   ├── lib/
│   │   ├── supabase.ts               ← Client con ANON_KEY + tipi generati
│   │   ├── stripe.ts                 ← stripePromise singleton
│   │   └── queryClient.ts            ← TanStack Query client
│   ├── store/
│   │   └── authStore.ts              ← Zustand auth store (session, user, loading)
│   ├── hooks/
│   │   └── useAuthSetup.ts           ← Sincronizza sessione Supabase → store
│   ├── features/
│   │   ├── auth/
│   │   │   └── authService.ts        ← signIn/Up/Out, OAuth, Magic Link, OTP, 2FA
│   │   ├── payments/
│   │   │   ├── paymentsService.ts    ← redirectToCheckout, PaymentIntent, portale
│   │   │   └── paymentsHooks.ts      ← useSubscription (TanStack Query)
│   │   ├── posts/
│   │   │   └── postsHooks.ts         ← usePosts, useCreatePost, useRealtimePosts
│   │   └── media/
│   │       └── storageService.ts     ← validateFile, uploadAvatar, getSignedUrl
│   ├── components/
│   │   └── ProtectedRoute.tsx        ← ProtectedRoute + SubscriptionRoute
│   ├── pages/
│   │   └── CallbackPage.tsx          ← OAuth/Magic Link callback handler
│   ├── test/
│   │   └── setup.ts                  ← Vitest setup + mock Supabase globale
│   └── e2e/
│       └── auth.spec.ts              ← Playwright: login, logout, redirect guard
│
└── mobile/                           ← Expo SDK 54+ + TypeScript
    ├── app/
    │   └── _layout.tsx               ← Root layout: StripeProvider, GestureHandler, auth guard
    └── src/
        ├── design/
        │   ├── tokens.ts             ← Palette, spacing, radius, fontSize, shadow cross-platform
        │   └── theme.ts              ← lightTheme + darkTheme semantici
        ├── hooks/
        │   ├── useTheme.ts           ← Accesso al tema corrente (light/dark auto)
        │   └── useAuth.ts            ← Sessione globale con cleanup subscription
        ├── lib/
        │   ├── supabase.ts           ← Client con SecureStore adapter + AppState refresh
        │   ├── edgeFunctions.ts      ← callEdgeFunction + api helpers
        │   └── notifications.ts      ← Push notification setup e registrazione token
        ├── features/
        │   ├── auth/
        │   │   └── authService.ts    ← signIn/Up/Out, OAuth, OTP SMS, 2FA TOTP
        │   ├── payments/
        │   │   ├── paymentsService.ts← createPaymentIntent, portale, getSubscription
        │   │   └── useSubscription.ts← Hook con Realtime per aggiornamenti live
        │   └── media/
        │       └── storageService.ts ← pickAndUploadAvatar con ridimensionamento
        └── utils/
            └── validation.ts         ← Schema Zod condivisi + secureLogout
```

---

## Guida rapida per sezione

### Setup database
→ Esegui `shared/sql/schema.sql` poi `shared/sql/rls.sql` su Supabase Dashboard → SQL Editor

### Genera tipi TypeScript
```bash
npx supabase gen types typescript --linked > src/types/database.ts
```

### Deploy Edge Functions
```bash
supabase secrets set RESEND_API_KEY=re_xxx
supabase secrets set STRIPE_SECRET_KEY=sk_live_xxx
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx
supabase functions deploy send-email
supabase functions deploy send-otp-custom
supabase functions deploy stripe-webhook
```

### Test Stripe in locale
```bash
stripe listen --forward-to localhost:3000/payments/webhook
stripe trigger checkout.session.completed
stripe trigger customer.subscription.created
# Carte test: 4242424242424242 (ok) | 4000000000009995 (fallisce) | 4000002500003155 (3DS)
```

### Load test backend
```bash
artillery run backend/tests/artillery.yml
artillery run backend/tests/artillery.yml --output report.json && artillery report report.json
```

### Test E2E web
```bash
npx playwright test web/e2e/auth.spec.ts
npx playwright test --ui
```

---

## Chiavi API — regola d'oro

```
SERVICE_ROLE_KEY  → solo backend Node.js. MAI nel bundle web/mobile.
STRIPE_SECRET_KEY → solo backend Node.js. MAI nel bundle web/mobile.
ANON_KEY          → web (VITE_SUPABASE_ANON_KEY) e mobile (EXPO_PUBLIC_SUPABASE_ANON_KEY)
STRIPE_PK         → web (VITE_STRIPE_PUBLISHABLE_KEY) e mobile (EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY)
```

---

## Note di sicurezza

```
🔑 Secrets         → SERVICE_ROLE_KEY e STRIPE_SECRET_KEY solo su backend
🔒 RLS             → abilitata su ogni tabella — vedi shared/sql/rls.sql
🔄 Token refresh   → autoRefreshToken: true + AppState listener su mobile
🗑️  Cleanup        → ogni subscription/channel ha sempre return () => cleanup()
📝 Audit           → logger.js su tutte le route /auth, /admin, /payments
🌐 HTTPS           → obbligatorio in produzione su tutti i layer
🧪 Test negativi   → 401, 403, 422, 429 — vedi backend/tests/postman-collection.json
💳 Stripe webhook  → verifica firma SEMPRE con constructWebhookEvent prima di elaborare
⚡ Tipi TypeScript → rigenera database.ts dopo ogni migration SQL
```
