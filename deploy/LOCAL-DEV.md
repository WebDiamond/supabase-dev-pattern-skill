# =============================================================
# LOCAL-DEV.md — Guida completa ambiente di sviluppo locale
# =============================================================
# Tutti i comandi per avviare, testare e debuggare ogni layer
# dell'applicazione sul tuo computer.

---

## Prerequisiti globali

```bash
# Node.js 20 LTS (tramite nvm — consigliato)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 20 && nvm use 20 && nvm alias default 20
node --version   # v20.x.x

# Supabase CLI
npm install -g supabase

# EAS CLI (per mobile)
npm install -g eas-cli

# Stripe CLI (per testare webhook)
brew install stripe/stripe-cli/stripe   # macOS
# Windows: https://github.com/stripe/stripe-cli/releases
stripe login

# AWS CLI (per S3)
brew install awscli   # macOS
aws configure         # inserisci Access Key, Secret, Region
```

---

## BACKEND — Node.js + Express

```bash
cd backend/

# 1. Installa dipendenze
npm install

# 2. Copia e compila .env
cp .env.example .env
# → apri .env e compila con i valori reali

# 3. Avvia in modalità sviluppo (hot-reload con nodemon)
npm run dev
# → http://localhost:3000

# 4. Avvia in modalità produzione
NODE_ENV=production npm start

# 5. Test API con curl rapido
curl http://localhost:3000/health
curl -X POST http://localhost:3000/auth/otp/send \
  -H "Content-Type: application/json" \
  -d '{"phone": "+393331234567"}'

# 6. Test Stripe webhook in locale
stripe listen --forward-to localhost:3000/payments/webhook
# In un altro terminale:
stripe trigger checkout.session.completed
stripe trigger customer.subscription.created
stripe trigger payment_intent.succeeded

# 7. Test con Postman
# Importa: backend/tests/postman-collection.json
# Imposta variabile BASE_URL = http://localhost:3000

# 8. Load test Artillery
npm install -g artillery
artillery run backend/tests/artillery.yml
artillery run backend/tests/artillery.yml --output report.json
artillery report report.json   # apre report HTML

# 9. Visualizza log in tempo reale
tail -f logs/audit.log
tail -f logs/error.log
```

---

## WEB — React + Vite

```bash
cd web/   # o nella root del progetto web

# 1. Installa dipendenze
npm install

# 2. Copia e compila .env
cp .env.example .env
# Compila: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY,
#          VITE_STRIPE_PUBLISHABLE_KEY, VITE_GOOGLE_MAPS_API_KEY

# 3. Avvia sviluppo (hot-reload istantaneo)
npm run dev
# → http://localhost:5173

# 4. Type check TypeScript
npx tsc --noEmit

# 5. Lint
npm run lint
npm run lint -- --fix   # correggi automaticamente

# 6. Test unitari Vitest
npx vitest                    # watch mode
npx vitest --ui               # interfaccia grafica browser
npx vitest run                # single run (CI)
npx vitest run --coverage     # con report coverage

# 7. Test E2E Playwright
npx playwright install --with-deps chromium   # prima volta
npx playwright test                           # tutti i test
npx playwright test --ui                      # interfaccia grafica
npx playwright test web/e2e/auth.spec.ts      # solo auth
npx playwright test --debug                   # modalità debug step-by-step
npx playwright show-report                    # apre report HTML

# 8. Preview build produzione
npm run build
npm run preview
# → http://localhost:4173 (build ottimizzata)

# 9. Analisi bundle size
npm run build -- --mode=analyze   # se configurato
# Oppure:
npx vite-bundle-visualizer
```

---

## MOBILE — Expo

```bash
cd mobile/   # o nella root del progetto Expo

# 1. Installa dipendenze
npm install
npx expo install --fix   # correggi versioni incompatibili

# 2. Copia e compila .env
cp .env.example .env
# Compila: EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY,
#          EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY, EXPO_PUBLIC_BACKEND_URL

# 3. Avvia Metro bundler
npx expo start              # mostra QR code per Expo Go
npx expo start --clear      # pulisci cache (se ci sono errori strani)

# 4. Apri su dispositivo/simulatore
npx expo start --ios        # simulatore iOS (solo macOS)
npx expo start --android    # emulatore Android
npx expo start --web        # browser (modalità web)

# 5. Expo Go — usa l'app sul dispositivo fisico
# Installa "Expo Go" da App Store / Play Store
# Scansiona il QR code mostrato da npx expo start

# 6. Type check TypeScript
npx tsc --noEmit

# 7. Test unitari Jest
npx jest                    # single run
npx jest --watchAll         # watch mode
npx jest --coverage         # con coverage
npx jest --verbose          # output dettagliato

# 8. Simula notifiche push in locale (richiede dispositivo fisico)
# Nel codice, usa:
# showLocalNotification({ title: 'Test', body: 'Notifica locale' })

# 9. Debug con Expo DevTools
npx expo start
# Premi 'd' nel terminale → apre Expo DevTools nel browser
# Oppure scuoti il dispositivo → menu sviluppatore

# 10. Inspect elementi (React DevTools)
npm install -g react-devtools
react-devtools
# → apri nel terminale dopo npx expo start
```

---

## SUPABASE — Locale con Docker

```bash
# Avvia Supabase in locale (richiede Docker)
supabase start
# → Studio:       http://localhost:54323
# → API:          http://localhost:54321
# → DB:           postgresql://postgres:postgres@localhost:54322/postgres
# → Inbucket:     http://localhost:54324 (email di test)

# Applica migrations
supabase db push

# Esegui lo schema manualmente
supabase db reset   # reset + riesegui tutte le migrations

# Genera tipi TypeScript dallo schema locale
supabase gen types typescript --local > src/types/database.ts

# Avvia Edge Functions in locale
supabase functions serve
# → http://localhost:54321/functions/v1/send-email

# Test Edge Function
curl -X POST http://localhost:54321/functions/v1/send-email \
  -H "Content-Type: application/json" \
  -d '{"to":"test@test.com","subject":"Test","html":"<p>Ciao</p>"}'

# Ferma Supabase locale
supabase stop

# Visualizza log
supabase logs

# Studio (dashboard locale)
supabase studio
# → http://localhost:54323
```

---

## AWS S3 — Test locale con LocalStack

```bash
# Installa LocalStack (emulatore AWS locale)
pip install localstack
# Oppure con Docker:
docker run -d -p 4566:4566 -e SERVICES=s3 localstack/localstack

# Configura AWS CLI per LocalStack
aws configure --profile localstack
# Access Key ID:     test
# Secret Access Key: test
# Region:            eu-south-1
# Output format:     json

# Crea bucket di test
aws --endpoint-url=http://localhost:4566 --profile localstack \
  s3api create-bucket --bucket test-bucket --region eu-south-1 \
  --create-bucket-configuration LocationConstraint=eu-south-1

# Testa upload
aws --endpoint-url=http://localhost:4566 --profile localstack \
  s3 cp ./test-file.txt s3://test-bucket/

# Lista bucket
aws --endpoint-url=http://localhost:4566 --profile localstack \
  s3 ls s3://test-bucket/

# Variabili d'ambiente per puntare a LocalStack nel backend:
# AWS_ENDPOINT_URL=http://localhost:4566
# AWS_ACCESS_KEY_ID=test
# AWS_SECRET_ACCESS_KEY=test
```

---

## Google Maps — Test locale

```bash
# Nessun emulatore necessario — la Maps API funziona con chiave di sviluppo.
# 
# Best practice per lo sviluppo:
# 1. Crea una chiave API separata per sviluppo (NON la chiave produzione)
# 2. Restringi la chiave a localhost:5173 (web) o a nessun IP (mobile dev)
# 3. Imposta un budget di spesa mensile su Google Cloud Console
#
# Per mobile in locale, aggiungi in app.json:
# "ios":     { "config": { "googleMapsApiKey": "$EXPO_PUBLIC_GOOGLE_MAPS_API_KEY" } }
# "android": { "config": { "googleMaps": { "apiKey": "$EXPO_PUBLIC_GOOGLE_MAPS_API_KEY" } } }
#
# Oppure usa app.config.js per caricare da .env:
# export default {
#   expo: {
#     ios:     { config: { googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY } },
#     android: { config: { googleMaps: { apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY } } }
#   }
# }
```

---

## Avvia TUTTO insieme (full-stack locale)

```bash
# Terminale 1 — Supabase
supabase start

# Terminale 2 — Backend
cd backend && npm run dev

# Terminale 3 — Web
cd web && npm run dev

# Terminale 4 — Stripe webhook
stripe listen --forward-to localhost:3000/payments/webhook

# Terminale 5 — Mobile
cd mobile && npx expo start

# Terminale 6 (opzionale) — Edge Functions locale
supabase functions serve
```

---

## Problemi comuni e soluzioni

```bash
# Metro bundler bloccato
npx expo start --clear

# Dipendenze Expo incompatibili
npx expo install --fix

# Port già in uso
lsof -ti:3000 | xargs kill  # backend
lsof -ti:5173 | xargs kill  # web

# Cache node_modules corrotta
rm -rf node_modules && npm install

# Simulatore iOS non si apre
sudo xcode-select --reset
xcrun simctl list devices   # lista simulatori disponibili

# Emulatore Android non si avvia
# Apri Android Studio → AVD Manager → Start

# Supabase locale non parte
docker ps   # verifica Docker attivo
supabase stop && supabase start   # riavvia

# Playwright test fallisce per timeout
npx playwright test --timeout=60000

# Type errors con tipi Supabase
supabase gen types typescript --local > src/types/database.ts
```
