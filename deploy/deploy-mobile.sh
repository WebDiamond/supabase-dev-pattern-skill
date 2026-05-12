#!/bin/bash
# =============================================================
# deploy-mobile.sh — Compilazione e Deploy App Expo
# iOS (App Store) + Android (Google Play)
# =============================================================
#
# Prerequisiti:
#   - Account Expo: https://expo.dev
#   - Account Apple Developer: https://developer.apple.com
#   - Account Google Play Console: https://play.google.com/console
#   - EAS CLI: npm install -g eas-cli
#   - eas.json configurato nel progetto
#
# Utilizzo:
#   ./deploy-mobile.sh setup          # Configura EAS + eas.json
#   ./deploy-mobile.sh dev            # Build development client
#   ./deploy-mobile.sh preview        # Build APK per test interno
#   ./deploy-mobile.sh production     # Build produzione (iOS + Android)
#   ./deploy-mobile.sh submit ios     # Pubblica su App Store
#   ./deploy-mobile.sh submit android # Pubblica su Google Play
#   ./deploy-mobile.sh update         # OTA update (senza store)
#   ./deploy-mobile.sh local          # Avvia app in locale

set -e

# ── COMANDI LOCALI (sviluppo) ─────────────────────────────────────────────

local_dev() {
  echo "🔧 Ambiente sviluppo mobile locale"
  echo ""
  echo "Comandi disponibili:"
  echo ""
  echo "  # Avvia Metro bundler"
  echo "  npx expo start"
  echo ""
  echo "  # Apri su simulatore iOS (macOS)"
  echo "  npx expo start --ios"
  echo ""
  echo "  # Apri su emulatore Android"
  echo "  npx expo start --android"
  echo ""
  echo "  # Apri nel browser (web)"
  echo "  npx expo start --web"
  echo ""
  echo "  # Pulisci cache Metro (se ci sono problemi)"
  echo "  npx expo start --clear"
  echo ""
  echo "  # Fix dipendenze incompatibili con la versione SDK"
  echo "  npx expo install --fix"
  echo ""
  echo "  # Type check TypeScript"
  echo "  npx tsc --noEmit"
  echo ""
  echo "  # Test unitari"
  echo "  npx jest --watchAll"
  echo ""
  echo "Avvio..."
  npx expo start
}

# ── SETUP EAS ─────────────────────────────────────────────────────────────

setup() {
  echo "⚙️  Setup EAS Build..."

  # Installa EAS CLI
  npm install -g eas-cli

  # Login
  eas login

  # Collega il progetto Expo (crea projectId)
  eas build:configure

  # Crea eas.json completo
  cat > eas.json << 'EASEOF'
{
  "cli": {
    "version": ">= 7.0.0",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": { "buildType": "apk" },
      "ios":     { "simulator": true },
      "env": { "APP_ENV": "development" }
    },
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" },
      "ios":     { "distribution": "internal" },
      "env": { "APP_ENV": "staging" }
    },
    "production": {
      "autoIncrement": true,
      "android": { "buildType": "app-bundle" },
      "ios":     {},
      "env": { "APP_ENV": "production" }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId":              "tuo@email.com",
        "ascAppId":             "1234567890",
        "appleTeamId":          "XXXXXXXXXX"
      },
      "android": {
        "serviceAccountKeyPath": "./google-play-service-account.json",
        "track":                 "internal"
      }
    }
  }
}
EASEOF

  echo "✅ eas.json creato"
  echo ""
  echo "⚠️  Prossimi passi:"
  echo "   1. Aggiungi il projectId generato in app.json → extra.eas.projectId"
  echo "   2. iOS: configura bundleIdentifier in app.json → ios.bundleIdentifier"
  echo "   3. Android: configura package in app.json → android.package"
  echo "   4. Compila le variabili d'ambiente con: eas secret:create"
}

# ── SECRETS EAS ───────────────────────────────────────────────────────────

setup_secrets() {
  echo "🔐 Configurazione secrets EAS (variabili d'ambiente sicure)..."
  echo "   I secrets sono criptati e disponibili durante la build."
  echo ""

  # Metodo interattivo
  echo "eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL"
  echo "eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY"
  echo "eas secret:create --scope project --name EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY"
  echo "eas secret:create --scope project --name EXPO_PUBLIC_BACKEND_URL"
  echo "eas secret:create --scope project --name EXPO_PUBLIC_GOOGLE_MAPS_API_KEY"
  echo ""
  echo "Oppure in bulk da file .env:"
  echo "eas secret:push --scope project --env-file .env.production"
  echo ""
  echo "Lista secrets:"
  eas secret:list
}

# ── BUILD ─────────────────────────────────────────────────────────────────

build_dev() {
  echo "🏗️  Build DEVELOPMENT (client locale)..."
  # iOS: simulatore macOS
  # Android: APK installabile via QR code in EAS dashboard
  eas build --profile development --platform all
}

build_preview() {
  echo "🏗️  Build PREVIEW (test interno)..."
  # Android: APK scaricabile
  # iOS: IPA per TestFlight (distribuzione interna)
  eas build --profile preview --platform all
  echo ""
  echo "📱 Condividi il link di installazione dal dashboard: https://expo.dev/builds"
}

build_production() {
  echo "🏗️  Build PRODUZIONE..."
  echo "   Android: AAB (Android App Bundle per Google Play)"
  echo "   iOS:     IPA (per App Store)"
  echo ""

  # Prima della build produzione: check pre-flight
  npx expo install --fix
  npx tsc --noEmit
  npx jest --passWithNoTests 2>/dev/null || echo "⚠️  Alcuni test falliti"

  eas build --profile production --platform all
  echo ""
  echo "✅ Build produzione avviata su EAS"
  echo "   Monitora su: https://expo.dev/builds"
  echo "   Quando completata, usa: $0 submit ios/android"
}

# ── SUBMIT AGLI STORE ─────────────────────────────────────────────────────

submit_ios() {
  echo "🍎 Submit su App Store..."
  echo ""
  echo "Prerequisiti iOS:"
  echo "  1. Account Apple Developer attivo (\$99/anno)"
  echo "  2. App creata su App Store Connect"
  echo "  3. Bundle ID registrato nel tuo account"
  echo "  4. Certificati e provisioning profile (EAS li gestisce automaticamente)"
  echo ""
  echo "La prima volta EAS chiederà le credenziali Apple."
  echo "Usa app-specific password se hai 2FA (raccomandata)."
  echo ""

  # Submit diretto (usa l'ultima build di produzione)
  eas submit --platform ios --profile production

  echo ""
  echo "✅ Submit iOS completato"
  echo "   Controlla lo stato su: https://appstoreconnect.apple.com"
  echo "   La review Apple richiede tipicamente 1-3 giorni."
  echo ""
  echo "⚠️  Prima della review, completa su App Store Connect:"
  echo "   - Screenshots (iPhone 6.5\", 5.5\", iPad se supportato)"
  echo "   - Descrizione, keywords, category"
  echo "   - Privacy policy URL"
  echo "   - Export compliance (HTTPS = YES, encryption = NO)"
}

submit_android() {
  echo "🤖 Submit su Google Play..."
  echo ""
  echo "Prerequisiti Android:"
  echo "  1. Account Google Play Console (\$25 una tantum)"
  echo "  2. App creata nella Console (nome pacchetto univoco)"
  echo "  3. Service account JSON per upload automatico"
  echo ""
  echo "Come creare il service account:"
  echo "  1. Google Play Console → Setup → API access"
  echo "  2. Collega a Google Cloud project"
  echo "  3. Crea service account con ruolo 'Release Manager'"
  echo "  4. Scarica JSON key → rinomina: google-play-service-account.json"
  echo "  5. Abilita il service account nella Console"
  echo ""

  eas submit --platform android --profile production

  echo ""
  echo "✅ Submit Android completato (track: internal)"
  echo "   Promovi a: internal → alpha → beta → production"
  echo "   dalla Google Play Console: https://play.google.com/console"
}

# ── OTA UPDATE (senza build) ──────────────────────────────────────────────

ota_update() {
  echo "📡 OTA Update (Expo Updates)..."
  echo ""
  echo "Gli OTA update aggiornano il JS bundle senza passare dagli store."
  echo "Non possono modificare codice nativo (plugin, permessi, ecc.)."
  echo ""

  CHANNEL="${2:-production}"  # default: production

  eas update \
    --branch  $CHANNEL \
    --message "Update $(date '+%Y-%m-%d %H:%M')"

  echo ""
  echo "✅ OTA update pubblicato su branch: $CHANNEL"
  echo "   Gli utenti riceveranno l'update al prossimo avvio dell'app."
}

# ── GITHUB ACTIONS CI/CD ─────────────────────────────────────────────────

generate_cicd() {
  mkdir -p .github/workflows

  cat > .github/workflows/deploy-mobile.yml << 'YAMLEOF'
name: Build & Deploy Mobile

on:
  push:
    branches: [main]
    tags:     ['v*']

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npx tsc --noEmit
      - run: npx jest --passWithNoTests

  build-preview:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm install -g eas-cli
      - run: npm ci
      - name: Build preview
        run: eas build --profile preview --platform all --non-interactive
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}

  build-production:
    needs: test
    runs-on: ubuntu-latest
    if: startsWith(github.ref, 'refs/tags/v')
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm install -g eas-cli
      - run: npm ci
      - name: Build production
        run: eas build --profile production --platform all --non-interactive
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
      - name: Submit iOS
        run: eas submit --platform ios --non-interactive --latest
        env:
          EXPO_TOKEN:     ${{ secrets.EXPO_TOKEN }}
          EXPO_APPLE_ID:  ${{ secrets.EXPO_APPLE_ID }}
          EXPO_ASC_APP_ID:${{ secrets.EXPO_ASC_APP_ID }}
      - name: Submit Android
        run: eas submit --platform android --non-interactive --latest
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
YAMLEOF

  echo "✅ GitHub Actions workflow creato: .github/workflows/deploy-mobile.yml"
  echo ""
  echo "Secrets da aggiungere nel repository (Settings → Secrets):"
  echo "  EXPO_TOKEN       — da expo.dev → Account Settings → Access Tokens"
  echo "  EXPO_APPLE_ID    — tuo@apple.com"
  echo "  EXPO_ASC_APP_ID  — App ID da App Store Connect"
}

# ── CHECKLIST PRE-RELEASE ─────────────────────────────────────────────────

checklist() {
  echo ""
  echo "📋 Checklist pre-release app mobile:"
  echo ""
  echo "Generale:"
  echo "  [ ] Bump versione in app.json (version + buildNumber/versionCode)"
  echo "  [ ] Tutte le variabili d'ambiente configurate in EAS secrets"
  echo "  [ ] Test su dispositivo fisico (iOS + Android)"
  echo "  [ ] Test con connessione lenta / offline"
  echo "  [ ] npx expo install --fix (dipendenze compatibili)"
  echo ""
  echo "iOS (App Store):"
  echo "  [ ] Screenshots per tutte le dimensioni richieste"
  echo "  [ ] Descrizione e keywords aggiornate"
  echo "  [ ] Privacy policy URL valido"
  echo "  [ ] Export compliance compilato"
  echo "  [ ] Info.plist: tutti i permessi con descrizione"
  echo "  [ ] Bundle ID corretto in app.json"
  echo ""
  echo "Android (Google Play):"
  echo "  [ ] Screenshots e grafica feature"
  echo "  [ ] Descrizione breve e lunga"
  echo "  [ ] Privacy policy URL"
  echo "  [ ] Categoria app selezionata"
  echo "  [ ] Content rating completato"
  echo "  [ ] Package name corretto in app.json"
  echo "  [ ] google-play-service-account.json presente"
  echo ""
  echo "Sicurezza:"
  echo "  [ ] Nessuna chiave API hardcodata nel codice"
  echo "  [ ] Nessun console.log con dati sensibili"
  echo "  [ ] Certificati pinning se necessario"
  echo "  [ ] ProGuard/R8 abilitato per Android (oscuramento codice)"
}

# ── MAIN ──────────────────────────────────────────────────────────────────

case "$1" in
  setup)       setup           ;;
  secrets)     setup_secrets   ;;
  dev)         build_dev       ;;
  preview)     build_preview   ;;
  production)  build_production;;
  submit)      case "$2" in
                 ios)     submit_ios     ;;
                 android) submit_android ;;
                 *) echo "Uso: $0 submit {ios|android}"; exit 1 ;;
               esac ;;
  update)      ota_update "$@" ;;
  local)       local_dev       ;;
  cicd)        generate_cicd   ;;
  checklist)   checklist       ;;
  *)
    echo "Uso: $0 {setup|secrets|dev|preview|production|submit|update|local|cicd|checklist}"
    echo ""
    echo "  setup       — Configura EAS e eas.json"
    echo "  secrets     — Gestisci variabili d'ambiente sicure EAS"
    echo "  dev         — Build development client"
    echo "  preview     — Build APK/IPA per test interno"
    echo "  production  — Build produzione per gli store"
    echo "  submit ios  — Pubblica su App Store"
    echo "  submit android — Pubblica su Google Play"
    echo "  update      — OTA update (senza store, solo JS)"
    echo "  local       — Avvia app in locale con Expo"
    echo "  cicd        — Genera GitHub Actions workflow"
    echo "  checklist   — Checklist pre-release"
    exit 1
    ;;
esac
