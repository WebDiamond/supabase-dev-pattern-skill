---
tags: [output, reference, tabelle]
---

# Quick Reference

## Chiavi Supabase

| Chiave | Usata da | Bypassa RLS |
|---|---|---|
| `ANON_KEY` | Client web/mobile, Realtime | No |
| `SERVICE_ROLE_KEY` | Backend, Edge Functions | **Sì** |

> Mai esporre `SERVICE_ROLE_KEY` in variabili `VITE_` o `EXPO_PUBLIC_`

## Metodi Auth

| Metodo | Funzione Supabase | Piattaforma |
|---|---|---|
| Email + Password signup | `supabase.auth.signUp()` | Web + Mobile |
| Email + Password signin | `supabase.auth.signInWithPassword()` | Web + Mobile |
| OAuth | `supabase.auth.signInWithOAuth()` | Web (`skipBrowserRedirect: false`) |
| OAuth Mobile | `supabase.auth.signInWithOAuth()` + `exchangeCodeForSession()` | Mobile (`skipBrowserRedirect: true`) |
| Magic Link | `supabase.auth.signInWithOtp({ email })` | Web |
| OTP SMS | `supabase.auth.signInWithOtp({ phone })` | Web + Mobile |
| Verifica OTP | `supabase.auth.verifyOtp({ phone, token, type: 'sms' })` | Web + Mobile |
| TOTP Enroll | `supabase.auth.mfa.enroll({ factorType: 'totp' })` | Web + Mobile |
| TOTP Verify | `supabase.auth.mfa.challengeAndVerify()` | Web + Mobile |
| Sign out | `supabase.auth.signOut()` | Web + Mobile |
| Reset password | `supabase.auth.resetPasswordForEmail()` | Web |

## Stripe — Flussi di Pagamento

| Flusso | Funzione | Cosa restituisce |
|---|---|---|
| Checkout hosted | `createCheckoutSession()` | `{ sessionId, url }` → redirect |
| Elements custom | `createPaymentIntent()` | `{ clientSecret, orderId }` |
| Portale abbonamento | `createPortalSession()` | `url` → redirect |
| Abbonamento attivo | `getActiveSubscription()` | riga `subscriptions` |

## Stato Ordini Stripe

```
pending → paid       (checkout.session.completed / payment_intent.succeeded)
pending → failed     (payment_intent.payment_failed)
paid    → refunded   (manuale o webhook charge.refunded)
paid    → cancelled  (manuale)
```

## Stato Abbonamenti Stripe

```
trialing → active → past_due → canceled
incomplete (pagamento iniziale fallito)
cancel_at_period_end = true → canceled a fine periodo
```

## Middleware Express — Ordine

```
1. /payments router        ← PRIMA di json() per raw body webhook
2. helmet()
3. cors()
4. rateLimit() globale
5. rateLimit() su /auth
6. express.json({ limit: '10kb' })
7. sanitizeRequest
8. morgan
9. auditLog su /auth, /admin
```

## RLS — Permessi per Tabella

| Tabella | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| profiles | tutti | — | own | — |
| posts | published + own | own | own | own |
| orders | own | ❌ client | ❌ client | ❌ client |
| subscriptions | own | ❌ client | ❌ client | ❌ client |
| stripe_customers | own | ❌ client | ❌ client | ❌ client |

## Variabili d'Ambiente

| Variabile | Layer | Note |
|---|---|---|
| `SUPABASE_URL` | Backend, EF | URL progetto |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend, EF | Mai al client |
| `SUPABASE_ANON_KEY` | Backend (Realtime) | |
| `VITE_SUPABASE_URL` | Web | |
| `VITE_SUPABASE_ANON_KEY` | Web | |
| `EXPO_PUBLIC_SUPABASE_URL` | Mobile | |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Mobile | |
| `STRIPE_SECRET_KEY` | Backend, EF | Mai al client |
| `STRIPE_WEBHOOK_SECRET` | Backend, EF | |
| `ALLOWED_ORIGINS` | Backend | Comma-separated |
