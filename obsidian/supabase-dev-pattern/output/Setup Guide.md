---
tags: [output, setup, guide]
---

# Setup Guide — Nuovo Progetto da Zero

## 1. Supabase — Database

```bash
# Supabase Dashboard → SQL Editor
# Eseguire in ordine:
```

- [ ] Esegui [[Schema SQL]] → crea tabelle, trigger, realtime
- [ ] Esegui [[RLS SQL]] → abilita RLS e crea tutte le policy
- [ ] Dashboard → Storage → crea bucket `avatars` (public)
- [ ] Dashboard → Authentication → Email: abilita "Confirm email"

## 2. Supabase — Auth Providers

- [ ] Dashboard → Auth → Providers → Email/Password: ON
- [ ] (opzionale) Google OAuth: Client ID + Secret
- [ ] (opzionale) GitHub OAuth: App credentials
- [ ] (opzionale) Apple: Service ID + Key
- [ ] (opzionale) Phone: provider SMS (Twilio/Vonage)

## 3. Backend Express

```bash
npm install express helmet cors express-rate-limit morgan
npm install @supabase/supabase-js stripe express-validator
```

- [ ] Copia [[Express App]] → `src/app.js`
- [ ] Copia [[Auth Middleware]] → `src/middleware/auth.js`
- [ ] Copia [[Stripe Service]] → `src/services/stripeService.js`
- [ ] Configura `.env`:

```env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
ALLOWED_ORIGINS=https://tuodominio.com
NODE_ENV=production
```

## 4. Stripe

- [ ] Dashboard Stripe → Products → crea prodotti/prezzi
- [ ] Copia Price ID (`price_xxx`) per le checkout session
- [ ] Webhook: registra `https://tuo-progetto.supabase.co/functions/v1/stripe-webhook`
- [ ] Seleziona eventi: `checkout.session.completed`, `payment_intent.*`, `customer.subscription.*`, `invoice.payment_failed`
- [ ] Copia Webhook Secret → `STRIPE_WEBHOOK_SECRET`

## 5. Edge Functions

```bash
supabase functions deploy stripe-webhook
supabase secrets set STRIPE_SECRET_KEY=sk_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

- [ ] Copia [[Stripe Webhook EF]] → `supabase/functions/stripe-webhook/index.ts`
- [ ] Verifica con: `stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook`

## 6. Frontend Web

```bash
npm install @supabase/supabase-js zustand react-router-dom
```

- [ ] Copia [[Auth Service Web]] → `src/features/auth/authService.ts`
- [ ] Setup store + listener dalla wiki [[Frontend Web - Auth]]
- [ ] Configura `.env`:

```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_BACKEND_URL=https://api.tuodominio.com
```

## 7. Mobile (Expo)

```bash
npx expo install @supabase/supabase-js @react-native-async-storage/async-storage
npx expo install expo-web-browser expo-linking
```

- [ ] Copia [[Auth Service Mobile]] → `src/features/auth/authService.ts`
- [ ] `app.json` → aggiungi `"scheme": "nomapp"`
- [ ] Configura `.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
EXPO_PUBLIC_BACKEND_URL=https://api.tuodominio.com
```

## 8. Verifica Finale

- [ ] Checklist sicurezza completa → [[Sicurezza - Checklist]]
- [ ] Test signup → email di conferma ricevuta
- [ ] Test OAuth → redirect funzionante
- [ ] Test pagamento → ordine `paid` dopo webhook
- [ ] Test RLS → utente A non vede dati utente B
