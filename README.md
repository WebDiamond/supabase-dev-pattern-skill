# Supabase Dev Pattern

> Skill Claude per lo sviluppo full-stack con Supabase — backend Node.js, web React.js e mobile Expo, con autenticazione completa, pagamenti Stripe, sicurezza hardened e test pronti all'uso.

---

## Indice

- [Cos'è questa skill](#cosè-questa-skill)
- [Cosa copre](#cosa-copre)
- [Struttura della cartella](#struttura-della-cartella)
- [Come installare la skill in Claude](#come-installare-la-skill-in-claude)
- [Come usare la skill](#come-usare-la-skill)
- [Layer condiviso — Shared](#layer-condiviso--shared)
- [Layer Backend — Node.js + Express](#layer-backend--nodejs--express)
- [Layer Web — React.js + Vite](#layer-web--reactjs--vite)
- [Layer Mobile — Expo SDK 54+](#layer-mobile--expo-sdk-54)
- [Stripe — Integrazione pagamenti](#stripe--integrazione-pagamenti)
- [Setup iniziale passo per passo](#setup-iniziale-passo-per-passo)
- [Variabili d'ambiente](#variabili-dambiente)
- [Test e qualità](#test-e-qualità)
- [Sicurezza](#sicurezza)
- [Tecnologie e dipendenze](#tecnologie-e-dipendenze)
- [Domande frequenti](#domande-frequenti)

---

## Cos'è questa skill

Una **skill Claude** è un file (o una cartella di file) che insegna a Claude come affrontare un dominio specifico con pattern, codice e best practice predefinite. Quando carichi questa skill, Claude sa già come strutturare il codice, quali librerie usare, come gestire sicurezza, test e deploy — senza che tu debba spiegare ogni volta da capo.

**Supabase Dev Pattern** è una skill full-stack che copre **tutti e tre i layer** di un'applicazione moderna:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   EXPO MOBILE   │    │   REACT WEB     │    │ NODE.JS BACKEND │
│  (iOS/Android)  │    │  (Vite + TS)    │    │   (Express)     │
└────────┬────────┘    └────────┬────────┘    └────────┬────────┘
         │                      │                      │
         │         ANON_KEY     │         ANON_KEY     │ SERVICE_ROLE_KEY
         └──────────────────────┴──────────────────────┘
                                │
                    ┌───────────▼──────────┐
                    │      SUPABASE        │
                    │  Auth · DB · Storage │
                    │  Realtime · Edge Fn  │
                    └──────────────────────┘
                                │
                    ┌───────────▼──────────┐
                    │       STRIPE         │
                    │ Pagamenti · Abbonamen│
                    └──────────────────────┘
```

---

## Cosa copre

### Autenticazione
| Metodo | Backend | Web | Mobile |
|---|:---:|:---:|:---:|
| Email + Password | ✅ | ✅ | ✅ |
| OAuth Google / GitHub / Apple | — | ✅ | ✅ |
| Magic Link | — | ✅ | — |
| OTP SMS (Twilio/Vonage nativo) | ✅ | ✅ | ✅ |
| OTP SMS (provider custom via Edge Function) | ✅ | — | — |
| 2FA TOTP (Google Authenticator, Authy) | ✅ | ✅ | ✅ |
| JWT middleware + controllo ruoli | ✅ | — | — |

### Database
- Schema SQL completo con `profiles`, `posts`, `stripe_customers`, `orders`, `subscriptions`
- RLS Policies per ogni tabella e per lo Storage
- Trigger `updated_at` automatici
- Query tipizzate con tipi generati da Supabase CLI
- Paginazione, JOIN, upsert, soft-delete

### Pagamenti Stripe
| Feature | Backend | Web | Mobile |
|---|:---:|:---:|:---:|
| Checkout Hosted (Stripe) | ✅ | ✅ | — |
| Stripe Elements (pagamento custom) | ✅ | ✅ | — |
| PaymentSheet nativa | — | — | ✅ |
| Apple Pay / Google Pay | — | — | ✅ |
| Abbonamenti ricorrenti | ✅ | ✅ | ✅ |
| Portale gestione abbonamento | ✅ | ✅ | ✅ |
| Webhook Stripe (Edge Function) | ✅ | — | — |
| Guard per funzionalità premium | — | ✅ | ✅ |

### Storage
- Upload avatar con ridimensionamento automatico (400×400, WebP)
- Bucket pubblici (avatar) e privati (documenti) con URL firmati
- Storage Policies RLS
- Drag & drop su web, picker galleria/fotocamera su mobile

### Realtime
- Subscriptions live a cambiamenti nel DB (`postgres_changes`)
- Presenza utenti online (Presence)
- Aggiornamento cache TanStack Query automatico (web)
- Hook con cleanup corretto (mobile)

### Edge Functions (Deno)
- Invio email transazionale (Resend)
- OTP SMS via provider custom (Infobip, AWS SNS, ecc.)
- Webhook Stripe completo

### Mobile — Design System
- Token semantici (palette, spacing, radius, font, shadow cross-platform)
- Light/Dark mode automatica via `useColorScheme`
- Componenti UI riusabili: `Button`, `Input`, `Card`, `ScreenWrapper`, `Toast`
- Animazioni con `react-native-reanimated`
- Feedback aptico con `expo-haptics`
- Accessibilità completa (accessibilityRole, accessibilityLabel, accessibilityState)
- Tap target minimo 44×44pt (Apple HIG)

### Sicurezza
- **Backend**: Helmet, CORS whitelist, rate limiting per livello, sanitizzazione XSS, audit log, body limit, stack trace nascosto in produzione
- **Web**: CSP, protezione XSS con DOMPurify, token storage, validazione Zod
- **Mobile**: SecureStore (keychain iOS / EncryptedSharedPreferences Android), auto-refresh AppState, logout sicuro, messaggi di errore generici

### Test
- **Backend**: Collection Postman importabile (casi positivi e negativi), Artillery load test (warm-up, carico sostenuto, spike)
- **Web**: Setup Vitest con mock Supabase globale, test E2E Playwright (login, logout, redirect, guard)
- **Mobile**: Configurazione Jest + RNTL con `transformIgnorePatterns` corretto

---

## Struttura della cartella

```
supabase-dev-pattern/
│
├── README.md                          ← questo file
├── SKILL.md                           ← indice navigabile per Claude
│
├── shared/                            ← codice condiviso tra tutti i layer
│   ├── sql/
│   │   ├── schema.sql                 ← CREATE TABLE + trigger
│   │   └── rls.sql                    ← Row Level Security policies
│   └── edge-functions/
│       ├── send-email.ts              ← Deno — email via Resend
│       ├── send-otp-custom.ts         ← Deno — OTP SMS provider custom
│       └── stripe-webhook.ts          ← Deno — gestione eventi Stripe
│
├── backend/                           ← Node.js + Express
│   ├── lib/
│   │   ├── app.js                     ← Express + middleware sicurezza
│   │   ├── supabase.js                ← client SERVICE_ROLE_KEY
│   │   ├── stripe.js                  ← client Stripe
│   │   └── logger.js                  ← Winston logger
│   ├── middleware/
│   │   ├── auth.js                    ← requireAuth, requireRole
│   │   ├── sanitize.js                ← sanitizzazione XSS
│   │   └── audit.js                   ← audit log route sensibili
│   ├── routes/
│   │   ├── auth.js                    ← OTP SMS send/verify
│   │   ├── mfa.js                     ← 2FA TOTP enroll/verify/unenroll
│   │   ├── posts.js                   ← CRUD post con validazione
│   │   └── payments.js                ← Checkout, PaymentIntent, portale, webhook
│   ├── services/
│   │   ├── postService.js             ← query DB con paginazione
│   │   ├── storageService.js          ← upload, URL firmati, delete
│   │   └── stripeService.js           ← customer, checkout, portale, abbonamento
│   ├── validators/
│   │   └── postValidators.js          ← express-validator rules
│   ├── utils/
│   │   └── sanitize.js                ← sanitizePhone, sanitizePath
│   ├── workers/
│   │   └── realtimeWorker.js          ← worker Realtime server-side
│   └── tests/
│       ├── postman-collection.json    ← importabile in Postman
│       └── artillery.yml              ← load test
│
├── web/                               ← React.js + Vite + TypeScript
│   ├── lib/
│   │   ├── supabase.ts                ← client ANON_KEY + tipi generati
│   │   ├── stripe.ts                  ← stripePromise singleton
│   │   └── queryClient.ts             ← TanStack Query client
│   ├── store/
│   │   └── authStore.ts               ← Zustand auth store
│   ├── hooks/
│   │   └── useAuthSetup.ts            ← sincronizza sessione → store
│   ├── features/
│   │   ├── auth/authService.ts        ← tutti i metodi auth
│   │   ├── payments/
│   │   │   ├── paymentsService.ts     ← checkout, intent, portale
│   │   │   └── paymentsHooks.ts       ← useSubscription
│   │   ├── posts/postsHooks.ts        ← TanStack Query hooks
│   │   └── media/storageService.ts    ← upload + validazione
│   ├── components/
│   │   └── ProtectedRoute.tsx         ← ProtectedRoute + SubscriptionRoute
│   ├── pages/
│   │   └── CallbackPage.tsx           ← OAuth/Magic Link handler
│   ├── test/
│   │   └── setup.ts                   ← Vitest setup + mock globale
│   └── e2e/
│       └── auth.spec.ts               ← Playwright E2E
│
└── mobile/                            ← Expo SDK 54+ + TypeScript
    ├── app/
    │   └── _layout.tsx                ← root layout con tutti i Provider
    └── src/
        ├── design/
        │   ├── tokens.ts              ← palette, spacing, radius, font, shadow
        │   └── theme.ts               ← lightTheme + darkTheme
        ├── hooks/
        │   ├── useTheme.ts            ← tema corrente (auto light/dark)
        │   └── useAuth.ts             ← sessione con cleanup
        ├── lib/
        │   ├── supabase.ts            ← client con SecureStore adapter
        │   ├── edgeFunctions.ts       ← callEdgeFunction + api helpers
        │   └── notifications.ts       ← push notification setup
        ├── features/
        │   ├── auth/authService.ts    ← signIn/Up/Out, OAuth, OTP, 2FA
        │   ├── payments/
        │   │   ├── paymentsService.ts ← intent, portale, subscription
        │   │   └── useSubscription.ts ← hook con Realtime
        │   └── media/storageService.ts← upload avatar con manipolazione
        └── utils/
            └── validation.ts          ← schema Zod + secureLogout
```

**Totale: 51 file · 34 cartelle**

---

## Come installare la skill in Claude

### Metodo 1 — Tramite il sito claude.ai

1. Accedi a [claude.ai](https://claude.ai)
2. Clicca sull'icona delle **Skills** nella barra laterale
3. Clicca su **"Installa skill"** o **"+"**
4. Carica il file **`supabase-dev-pattern.zip`**
5. La skill sarà disponibile in tutte le tue conversazioni

### Metodo 2 — Caricare i file direttamente in chat

Se non hai accesso alle skill, puoi caricare i file direttamente in una conversazione:

1. Apri una nuova chat con Claude
2. Carica `SKILL.md` e i file delle sezioni che ti servono
3. Scrivi: *"Usa questi file come riferimento per il mio progetto Supabase"*

### Metodo 3 — Usare solo il SKILL.md

Il file `SKILL.md` da solo è sufficiente per i casi d'uso più comuni. Caricalo in chat e Claude userà i pattern descritti.

---

## Come usare la skill

Una volta installata, puoi chiedere a Claude in linguaggio naturale. Esempi reali:

### Setup e configurazione

```
"Inizia un nuovo progetto Supabase con Node.js backend"
"Configura il client Supabase per Expo con SecureStore"
"Crea il database con lo schema per un'app con utenti e abbonamenti Stripe"
"Genera le RLS policies per la mia tabella posts"
```

### Autenticazione

```
"Implementa il login con email e password per React"
"Aggiungi il login con Google tramite OAuth su Expo"
"Crea la schermata OTP SMS con le 6 caselle separate"
"Come configuro il 2FA TOTP su mobile?"
"Scrivi il middleware JWT per Express con controllo ruoli"
```

### Database

```
"Scrivi una query con paginazione e JOIN al profilo autore"
"Come faccio l'upsert sicuro su Supabase?"
"Crea un hook TanStack Query per i post con optimistic update"
"Come genero i tipi TypeScript dallo schema Supabase?"
```

### Pagamenti Stripe

```
"Integra Stripe Checkout per un abbonamento mensile"
"Crea la PaymentSheet nativa per Expo con Apple Pay"
"Come gestisco il webhook Stripe con Supabase Edge Functions?"
"Aggiungi un portale di gestione abbonamento"
"Crea un componente che blocca l'accesso agli utenti senza abbonamento"
```

### Storage

```
"Upload avatar da galleria su mobile con ridimensionamento"
"Come faccio drag & drop per upload su web?"
"Crea un URL firmato per un documento privato"
"Configura le Storage Policies per il bucket avatars"
```

### Sicurezza

```
"Aggiungi rate limiting e sanitizzazione al backend Express"
"Come proteggo le route da utenti non autenticati su React?"
"Configura Helmet e CORS per il backend"
"Scrivi un audit log per le route di autenticazione"
```

### Test

```
"Crea i test Postman per le API di autenticazione"
"Configura Artillery per il load test del backend"
"Scrivi i test E2E Playwright per il flusso di login"
"Come configuro Vitest con il mock di Supabase?"
```

### Design System (mobile)

```
"Crea un componente Button con animazione e feedback aptico"
"Come implemento la dark mode automatica su Expo?"
"Scrivi un componente Input con animazione focus e errore accessibile"
"Aggiungi un Toast con animazione slide-in"
```

---

## Layer condiviso — Shared

### `shared/sql/schema.sql`

Contiene tutte le tabelle del progetto. Va eseguito **una sola volta** su Supabase:

1. Vai su **Supabase Dashboard → SQL Editor**
2. Incolla e lancia `schema.sql`
3. Poi lancia `rls.sql`

Tabelle create:
- **`profiles`** — estende `auth.users`, aggiunge `username`, `bio`, `avatar_url`, `push_token`, `role`
- **`posts`** — contenuti con `title`, `content`, `published`, collegati al profilo
- **`stripe_customers`** — associazione 1:1 tra utente Supabase e Stripe Customer
- **`orders`** — ordini/pagamenti singoli con stati (`pending`, `paid`, `failed`, ...)
- **`subscriptions`** — abbonamenti ricorrenti con stati e date di rinnovo

### `shared/sql/rls.sql`

Imposta Row Level Security su ogni tabella. Regole principali:
- **profiles**: tutti possono leggere, solo il proprietario può modificare
- **posts**: pubblicati visibili a tutti, CRUD solo per il proprietario
- **stripe_customers / orders / subscriptions**: solo lettura per l'utente, scrittura solo via backend con `SERVICE_ROLE_KEY`
- **storage (avatars)**: upload solo nella propria cartella (`userId/`), lettura pubblica, delete solo propri file

### `shared/edge-functions/`

Le Edge Functions girano su **Deno** e sono accessibili da tutti i layer. Per fare il deploy:

```bash
# Imposta i segreti necessari
supabase secrets set RESEND_API_KEY=re_xxx
supabase secrets set STRIPE_SECRET_KEY=sk_live_xxx
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx
supabase secrets set SMS_PROVIDER_KEY=xxx

# Deploy
supabase functions deploy send-email
supabase functions deploy send-otp-custom
supabase functions deploy stripe-webhook
```

Registra il webhook Stripe su [dashboard.stripe.com/webhooks](https://dashboard.stripe.com/webhooks) con URL:
```
https://TUO-PROJECT-ID.supabase.co/functions/v1/stripe-webhook
```

---

## Layer Backend — Node.js + Express

### Avvio rapido

```bash
npm install @supabase/supabase-js express dotenv helmet cors \
  express-rate-limit express-validator multer morgan winston stripe
npm install --save-dev nodemon
```

Crea `.env`:
```env
SUPABASE_URL=https://xyzxyz.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_ANON_KEY=eyJ...
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
PORT=3000
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:5173
CLIENT_URL=http://localhost:5173
```

### File chiave

| File | Scopo |
|---|---|
| `lib/app.js` | Entry point Express con tutti i middleware in ordine corretto |
| `lib/supabase.js` | Client Supabase con `SERVICE_ROLE_KEY` — bypassa RLS |
| `middleware/auth.js` | `requireAuth` + `requireRole` — protezione route |
| `routes/payments.js` | Tutte le route Stripe, incluso il webhook con `express.raw()` |
| `services/stripeService.js` | Logica Stripe: customer, checkout, portale, abbonamento |
| `tests/postman-collection.json` | Importa in Postman per testare tutte le API |
| `tests/artillery.yml` | Load test con 3 fasi: warm-up, carico sostenuto, spike |

> ⚠️ **Ordine critico in app.js**: la route `/payments` (con il webhook) va registrata **prima** di `express.json()`, altrimenti Stripe non riesce a verificare la firma del webhook.

### Sicurezza backend

Il file `app.js` include in ordine:
1. **Helmet** — header HTTP sicuri (CSP, HSTS, X-Frame-Options)
2. **CORS** — whitelist dei domini autorizzati
3. **Rate limiting globale** — 100 richieste ogni 15 minuti
4. **Rate limiting auth** — 10 richieste ogni 15 minuti su `/auth`
5. **Body parser** — limite 10kb per prevenire payload bombing
6. **Sanitizzazione** — rimuove script injection, javascript: URI, event handler
7. **Morgan** — logging HTTP
8. **Audit log** — log dettagliato su `/auth` e `/admin`

---

## Layer Web — React.js + Vite

### Avvio rapido

```bash
npm create vite@latest my-app -- --template react-ts
cd my-app
npm install @supabase/supabase-js react-router-dom zustand
npm install @tanstack/react-query @tanstack/react-query-devtools
npm install @stripe/stripe-js @stripe/react-stripe-js
npm install react-hook-form zod @hookform/resolvers
npm install -D vitest @vitest/ui jsdom @testing-library/react playwright
```

Crea `.env`:
```env
VITE_SUPABASE_URL=https://xyzxyz.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
```

### File chiave

| File | Scopo |
|---|---|
| `lib/supabase.ts` | Client tipizzato con `ANON_KEY` e `detectSessionInUrl: true` per OAuth |
| `lib/stripe.ts` | `stripePromise` singleton — carica Stripe una volta sola |
| `store/authStore.ts` | Zustand store con `session`, `user`, `loading` |
| `hooks/useAuthSetup.ts` | Sincronizza sessione Supabase → store, chiama nel root component |
| `features/auth/authService.ts` | Tutti i metodi auth: email, OAuth, Magic Link, OTP, 2FA |
| `features/payments/paymentsService.ts` | Checkout, PaymentIntent, portale — chiama sempre il backend |
| `components/ProtectedRoute.tsx` | Guard per route autenticate e route premium |
| `test/setup.ts` | Mock globale Supabase per Vitest |
| `e2e/auth.spec.ts` | Test E2E Playwright per i flussi di autenticazione |

### Pattern fondamentale — sessione

```tsx
// main.tsx
import { useAuthSetup } from './hooks/useAuthSetup'

function App() {
  useAuthSetup()  // ← chiama sempre nel componente root
  return <RouterProvider router={router} />
}
```

```tsx
// router/index.tsx
{ element: <ProtectedRoute />, children: [
  { path: '/dashboard', element: <DashboardPage /> },
]}
{ element: <SubscriptionRoute />, children: [
  { path: '/premium', element: <PremiumPage /> },
]}
```

---

## Layer Mobile — Expo SDK 54+

### Avvio rapido

```bash
npx create-expo-app MyApp --template blank-typescript
cd MyApp

npx expo install @supabase/supabase-js expo-secure-store
npx expo install expo-router expo-linking expo-web-browser
npx expo install expo-image-picker expo-file-system expo-image-manipulator expo-crypto
npx expo install expo-notifications expo-device expo-haptics
npx expo install react-native-reanimated react-native-gesture-handler
npx expo install react-native-safe-area-context
npm install @stripe/stripe-react-native
npm install react-hook-form zod @hookform/resolvers zustand
```

Crea `.env`:
```env
EXPO_PUBLIC_SUPABASE_URL=https://xyzxyz.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
EXPO_PUBLIC_BACKEND_URL=https://tuo-backend.com
EXPO_PUBLIC_EAS_PROJECT_ID=xxx
```

### File chiave

| File | Scopo |
|---|---|
| `app/_layout.tsx` | Root con `StripeProvider`, `GestureHandlerRootView`, `SafeAreaProvider` e auth guard |
| `src/lib/supabase.ts` | Client con `SecureStoreAdapter` + `AppState` listener per auto-refresh |
| `src/design/tokens.ts` | Token di design: palette, spacing, radius, fontSize, shadow cross-platform |
| `src/design/theme.ts` | `lightTheme` + `darkTheme` con colori semantici |
| `src/hooks/useTheme.ts` | Ritorna il tema corretto in base a `useColorScheme()` |
| `src/hooks/useAuth.ts` | Sessione globale con cleanup corretto della subscription |
| `src/features/auth/authService.ts` | signIn/Up/Out, OAuth (WebBrowser), OTP SMS, 2FA TOTP |
| `src/features/payments/useSubscription.ts` | Hook con Realtime per aggiornamenti live dell'abbonamento |
| `src/utils/validation.ts` | Schema Zod condivisi + `secureLogout` |

### Regole best practice Expo (obbligatorie)

```
✅ npx expo install (non npm) per i pacchetti SDK
✅ StyleSheet.create ovunque, mai oggetti inline nel render
✅ Platform.select per shadow cross-platform
✅ KeyboardAvoidingView con behavior corretto per OS
✅ return () => subscription.unsubscribe() in ogni useEffect con sub
✅ hitSlop su elementi touch piccoli (min 44×44pt)
✅ autoComplete + textContentType per autofill nativo
✅ keyboardShouldPersistTaps="handled" su ScrollView con form
```

### Design System — come usarlo

```tsx
import { useTheme } from '../hooks/useTheme'

function MyComponent() {
  const theme = useTheme()
  // theme.colors.primary, theme.spacing.lg, theme.radius.md, ecc.
  // Cambia automaticamente con light/dark mode
}
```

Componenti disponibili nella skill (da costruire seguendo i pattern):
- **`Button`** — varianti primary/secondary/ghost/danger, loading, animazione press, aptico
- **`Input`** — animazione focus con interpolazione colore, errore accessibile
- **`Card`** — superficie elevata con shadow
- **`ScreenWrapper`** — SafeArea + StatusBar + KeyboardAvoidingView
- **`Toast`** — notifica non invasiva con slide-in animation

---

## Stripe — Integrazione pagamenti

### Flusso architetturale (regola fondamentale)

```
                    ❌ MAI direttamente
Mobile/Web ────────────────────────────────▶ Stripe API
                                             (richiederebbe secret key nel client)

                    ✅ Pattern corretto
Mobile/Web ──▶ Backend Node.js ──▶ Stripe API
               (SECRET_KEY)        ↓
                    ◀──── clientSecret / sessionUrl ────
Mobile/Web ──▶ Stripe SDK client (solo publishable key)
```

### Backend — cosa fa

- Crea/recupera Stripe Customer (1:1 con utente Supabase)
- Crea `Checkout Session` (pagamento hosted su Stripe)
- Crea `PaymentIntent` (pagamento con Elements personalizzati)
- Genera URL portale gestione abbonamento
- Verifica firma webhook e aggiorna il DB

### Web — cosa fa

- Reindirizza a Stripe Hosted Checkout
- Renderizza `PaymentElement` di Stripe (Elements custom)
- Apre il portale gestione via redirect
- `useSubscription()` legge direttamente da Supabase (la tabella è aggiornata dal webhook)

### Mobile — cosa fa

- Usa `PaymentSheet` nativa (gestisce 3DS, Apple Pay, Google Pay automaticamente)
- Apre il portale Stripe in un `WebBrowser.openBrowserAsync()` in-app
- `useSubscription()` con Realtime: si aggiorna automaticamente dopo il webhook Stripe

### Test Stripe in locale

```bash
# Installa Stripe CLI
brew install stripe/stripe-cli/stripe

# Ascolta eventi e inoltrale al backend locale
stripe listen --forward-to localhost:3000/payments/webhook

# Simula eventi
stripe trigger checkout.session.completed
stripe trigger customer.subscription.created
stripe trigger payment_intent.succeeded

# Carte di test
4242 4242 4242 4242  → Pagamento riuscito ✅
4000 0000 0000 9995  → Pagamento fallito ❌
4000 0025 0000 3155  → Richiede 3DS 🔐
```

---

## Setup iniziale passo per passo

### 1. Crea il progetto Supabase

1. Vai su [supabase.com](https://supabase.com) → **New Project**
2. Copia `Project URL` e le chiavi `anon` e `service_role`

### 2. Inizializza il database

```bash
# Installa Supabase CLI
npm install -g supabase

# Collega al progetto
supabase login
supabase link --project-ref TUO-PROJECT-ID

# Esegui lo schema (o copia il contenuto in SQL Editor)
supabase db push
```

Oppure copia e incolla direttamente su **Supabase Dashboard → SQL Editor**:
1. `shared/sql/schema.sql`
2. `shared/sql/rls.sql`

### 3. Crea i bucket Storage

Su **Supabase Dashboard → Storage**:
- Crea bucket `avatars` → **Public**
- Crea bucket `documents` → **Private**

### 4. Configura Supabase Auth

Su **Supabase Dashboard → Authentication → Providers**:
- Abilita **Email** (già attivo di default)
- Per OAuth: abilita Google, GitHub, Apple con le credenziali dei rispettivi provider
- Per OTP SMS: abilita **Phone** con Twilio o Vonage

### 5. Genera i tipi TypeScript

```bash
npx supabase gen types typescript --linked > src/types/database.ts
```

Ripeti questo comando ogni volta che modifichi lo schema.

### 6. Deploy le Edge Functions

```bash
supabase secrets set RESEND_API_KEY=re_xxx
supabase functions deploy send-email
supabase functions deploy send-otp-custom
supabase functions deploy stripe-webhook
```

### 7. Configura Stripe

1. Crea account su [stripe.com](https://stripe.com)
2. Copia la **Publishable Key** e la **Secret Key**
3. Crea i prodotti/prezzi in **Stripe Dashboard → Products**
4. Registra il webhook su **Stripe Dashboard → Webhooks** con URL Edge Function
5. Copia il **Webhook Signing Secret**

---

## Variabili d'ambiente

### Backend Node.js

```env
SUPABASE_URL=https://xyzxyz.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...          # ⚠️ solo backend, mai nel client
SUPABASE_ANON_KEY=eyJ...
STRIPE_SECRET_KEY=sk_live_xxx             # ⚠️ solo backend, mai nel client
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRICE_ID_MONTHLY=price_xxx
STRIPE_PRICE_ID_YEARLY=price_xxx
PORT=3000
NODE_ENV=production
ALLOWED_ORIGINS=https://tuodominio.com
CLIENT_URL=https://tuodominio.com
```

### Web React (Vite)

```env
VITE_SUPABASE_URL=https://xyzxyz.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...             # chiave pubblica, ok nel bundle
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_xxx   # chiave pubblica, ok nel bundle
VITE_STRIPE_PRICE_MONTHLY=price_xxx
VITE_STRIPE_PRICE_YEARLY=price_xxx
```

### Mobile Expo

```env
EXPO_PUBLIC_SUPABASE_URL=https://xyzxyz.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...      # chiave pubblica, ok nel bundle
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
EXPO_PUBLIC_BACKEND_URL=https://tuo-backend.com
EXPO_PUBLIC_EAS_PROJECT_ID=xxx
```

### Edge Functions (Supabase Secrets)

```bash
supabase secrets set SUPABASE_URL=https://xyzxyz.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJ...
supabase secrets set STRIPE_SECRET_KEY=sk_live_xxx
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx
supabase secrets set RESEND_API_KEY=re_xxx
supabase secrets set SMS_PROVIDER_KEY=xxx
```

---

## Test e qualità

### Postman — API backend

1. Apri Postman
2. **Import** → seleziona `backend/tests/postman-collection.json`
3. Imposta le variabili d'ambiente: `BASE_URL`, `ACCESS_TOKEN`
4. Esegui la collection in ordine

Casi negativi inclusi (obbligatori per sicurezza):
- `401` — senza token / token scaduto
- `403` — ruolo insufficiente
- `422` — body non valido
- `429` — rate limit superato
- `400` — OTP errato / file tipo non supportato

### Artillery — Load test backend

```bash
npm install -g artillery

# Test completo (warm-up + carico + spike)
artillery run backend/tests/artillery.yml

# Con report HTML
artillery run backend/tests/artillery.yml --output report.json
artillery report report.json

# Quick test su singolo endpoint
artillery quick --count 100 --num 20 http://localhost:3000/posts
```

Soglie configurate:
- P95 response time < 500ms
- P99 response time < 1000ms

### Vitest — Unit/Component test web

```bash
# Configura vite.config.ts con la sezione test
npx vitest
npx vitest --coverage
npx vitest --ui  # interfaccia grafica
```

Il file `web/test/setup.ts` contiene il mock globale di Supabase — importalo nei test con `setupFiles`.

### Playwright — E2E web

```bash
# Installa browser
npx playwright install

# Esegui i test
npx playwright test web/e2e/auth.spec.ts
npx playwright test --ui       # interfaccia grafica
npx playwright show-report     # report HTML
```

### Jest + RNTL — Unit test mobile

```bash
npm install --save-dev jest jest-expo @testing-library/react-native
npx jest
npx jest --coverage
```

Il `transformIgnorePatterns` nel `jest.config.js` è già configurato correttamente per Expo + Supabase + Reanimated.

---

## Sicurezza

### Regola d'oro sulle chiavi

| Chiave | Dove va | Dove NON va |
|---|---|---|
| `SERVICE_ROLE_KEY` | Solo backend Node.js, Edge Functions | ❌ Mai nel bundle web/mobile |
| `STRIPE_SECRET_KEY` | Solo backend Node.js, Edge Functions | ❌ Mai nel bundle web/mobile |
| `ANON_KEY` | Web (VITE_), Mobile (EXPO_PUBLIC_) | ✅ Sicura nel client |
| `STRIPE_PUBLISHABLE_KEY` | Web (VITE_), Mobile (EXPO_PUBLIC_) | ✅ Sicura nel client |

### Checklist sicurezza per layer

**Backend:**
```
✅ Helmet — header HTTP sicuri
✅ CORS — whitelist domini
✅ Rate limiting — 100/15min globale, 10/15min su /auth
✅ Body limit — 10kb
✅ Sanitizzazione — XSS/script injection
✅ JWT verificato server-side con supabase.auth.getUser()
✅ Proprietà verificata nelle query (eq('user_id', req.user.id))
✅ Stack trace nascosto in produzione
✅ Audit log su /auth e /admin
✅ Webhook Stripe — firma verificata SEMPRE
```

**Web:**
```
✅ CSP configurata in Vite
✅ DOMPurify per dangerouslySetInnerHTML
✅ Zod su ogni form
✅ HTTPS forzato in produzione
✅ npm audit in CI/CD
```

**Mobile:**
```
✅ Token in SecureStore (keychain/EncryptedSharedPreferences)
✅ Auto-refresh su AppState
✅ Cleanup subscription in ogni useEffect
✅ Messaggi errore generici (non rivela se email/numero esiste)
✅ Tap target min 44×44pt
✅ Logout sicuro: signOut() + cancellazione SecureStore
```

---

## Tecnologie e dipendenze

### Comuni a tutti i layer
- [Supabase](https://supabase.com) — `@supabase/supabase-js`
- [Zod](https://zod.dev) — validazione schema
- [Stripe](https://stripe.com) — `stripe` (backend), `@stripe/stripe-js` (web), `@stripe/stripe-react-native` (mobile)

### Backend
- [Express.js](https://expressjs.com) — framework HTTP
- [Helmet](https://helmetjs.github.io) — header sicuri
- [cors](https://github.com/expressjs/cors) — CORS middleware
- [express-rate-limit](https://github.com/express-rate-limit/express-rate-limit) — rate limiting
- [express-validator](https://express-validator.github.io) — validazione body
- [Multer](https://github.com/expressjs/multer) — upload file
- [Winston](https://github.com/winstonjs/winston) — logging strutturato
- [Artillery](https://artillery.io) — load testing

### Web
- [Vite](https://vitejs.dev) + React 18 + TypeScript
- [React Router v6](https://reactrouter.com) — routing
- [TanStack Query v5](https://tanstack.com/query) — data fetching e caching
- [Zustand](https://zustand-demo.pmnd.rs) — state management
- [React Hook Form](https://react-hook-form.com) — form handling
- [Tailwind CSS](https://tailwindcss.com) — styling
- [Vitest](https://vitest.dev) — unit test
- [Playwright](https://playwright.dev) — E2E test

### Mobile
- [Expo SDK 54](https://expo.dev) — framework mobile
- [Expo Router](https://expo.github.io/router) — navigazione file-based
- [expo-secure-store](https://docs.expo.dev/versions/latest/sdk/securestore/) — storage sicuro token
- [react-native-reanimated](https://docs.swmansion.com/react-native-reanimated/) — animazioni performanti
- [react-native-gesture-handler](https://docs.swmansion.com/react-native-gesture-handler/) — gesture
- [expo-haptics](https://docs.expo.dev/versions/latest/sdk/haptics/) — feedback aptico
- [expo-image-picker](https://docs.expo.dev/versions/latest/sdk/imagepicker/) — selezione immagini
- [expo-image-manipulator](https://docs.expo.dev/versions/latest/sdk/imagemanipulator/) — ridimensionamento
- [Jest + RNTL](https://testing-library.com/docs/react-native-testing-library/intro/) — test

---

## Domande frequenti

**Posso usare questa skill con un progetto già esistente?**
Sì. I file sono indipendenti — puoi copiare solo le parti che ti servono (es. solo `shared/sql/rls.sql` o solo `web/features/payments/paymentsService.ts`) senza dover usare tutta la struttura.

**Devo usare tutti e tre i layer?**
No. Puoi usare solo il backend, solo il web o solo il mobile. La skill funziona anche per progetti single-platform.

**Come aggiorno i tipi TypeScript dopo una migration?**
Esegui `npx supabase gen types typescript --linked > src/types/database.ts` ogni volta che modifichi lo schema SQL.

**Il webhook Stripe non funziona in locale. Cosa faccio?**
Assicurati di aver installato la Stripe CLI e di aver avviato `stripe listen --forward-to localhost:3000/payments/webhook`. Controlla che la route `/payments/webhook` in `app.js` sia registrata **prima** di `express.json()`.

**Come aggiungo un nuovo metodo di pagamento?**
Aggiungi il `price_id` di Stripe nelle variabili d'ambiente, poi passa l'ID al componente `CheckoutButton` (web) o al `PaymentSheetButton` (mobile) con il `priceId` corretto.

**Le notifiche push non funzionano su simulatore.**
Le push notification richiedono un dispositivo fisico. Il codice in `notifications.ts` già gestisce questo con il controllo `Device.isDevice`.

**Come gestisco più ruoli utente (admin, moderator)?**
Aggiungi il ruolo nella tabella `profiles.role` (già nel schema), poi usa il middleware `requireRole('admin')` sulle route Express che vuoi proteggere.

**Posso usare un database diverso da Supabase?**
Il pattern è fortemente accoppiato a Supabase (Auth, RLS, Realtime, Storage). Per altri database dovresti riscrivere significativamente la logica di autenticazione e le query.

---

## Licenza

Questo progetto è distribuito come skill di riferimento — il codice è liberamente utilizzabile, modificabile e distribuibile nei tuoi progetti.

---

*Generato con Claude · Supabase Dev Pattern v1.0*
