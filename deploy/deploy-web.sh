#!/bin/bash
# =============================================================
# deploy-web.sh — Deploy Web App React (Vite) 
# Supporta: Vercel (zero-config), Netlify, server Nginx statico
# =============================================================
#
# Utilizzo:
#   ./deploy-web.sh vercel     # Deploy su Vercel (consigliato)
#   ./deploy-web.sh netlify    # Deploy su Netlify
#   ./deploy-web.sh nginx      # Deploy su server Nginx statico
#   ./deploy-web.sh build      # Solo build locale

set -e

APP_NAME="mia-app-web"
BUILD_DIR="dist"

# ── BUILD ─────────────────────────────────────────────────────────────────

build() {
  echo "🏗️  Build React + Vite..."

  # Installa dipendenze
  npm ci

  # Type check
  npx tsc --noEmit

  # Lint
  npm run lint 2>/dev/null || echo "⚠️  Lint non configurato"

  # Test unit (non bloccante in dev, bloccante in CI)
  if [ "$CI" = "true" ]; then
    npx vitest run --reporter=verbose
  fi

  # Build produzione
  NODE_ENV=production npm run build

  echo "✅ Build completata in ./$BUILD_DIR"
  echo "   $(du -sh $BUILD_DIR | cut -f1) totale"
  find $BUILD_DIR -name "*.js" | head -5 | xargs ls -lh 2>/dev/null || true
}

# ── VERCEL ────────────────────────────────────────────────────────────────

deploy_vercel() {
  echo "🚀 Deploy su Vercel..."

  # Installa Vercel CLI se non presente
  if ! command -v vercel &>/dev/null; then
    npm install -g vercel
  fi

  # Crea vercel.json se non esiste
  if [ ! -f "vercel.json" ]; then
    cat > vercel.json << 'EOF'
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm ci",
  "framework": "vite",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options",        "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy",        "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy",     "value": "camera=(), microphone=(), geolocation=(self)" }
      ]
    },
    {
      "source": "/assets/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    }
  ]
}
EOF
    echo "📄 vercel.json creato"
  fi

  # Login (apre browser se necessario)
  vercel login 2>/dev/null || true

  # Deploy in produzione
  if [ "$CI" = "true" ] || [ "$1" = "--prod" ]; then
    vercel --prod --yes
  else
    echo "Scegli: [p]roduzione o [pr]eview (default: preview)"
    read -r CHOICE
    if [ "$CHOICE" = "p" ]; then
      vercel --prod
    else
      vercel
    fi
  fi

  echo "✅ Deploy Vercel completato"
  echo "   Configura le env vars su: https://vercel.com/dashboard → Settings → Environment Variables"
}

# ── NETLIFY ───────────────────────────────────────────────────────────────

deploy_netlify() {
  echo "🚀 Deploy su Netlify..."

  if ! command -v netlify &>/dev/null; then
    npm install -g netlify-cli
  fi

  # Crea netlify.toml se non esiste
  if [ ! -f "netlify.toml" ]; then
    cat > netlify.toml << 'EOF'
[build]
  command     = "npm run build"
  publish     = "dist"

[build.environment]
  NODE_VERSION = "20"

[[redirects]]
  from   = "/*"
  to     = "/index.html"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options        = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy        = "strict-origin-when-cross-origin"

[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
EOF
    echo "📄 netlify.toml creato"
  fi

  netlify login 2>/dev/null || true
  build

  if [ "$CI" = "true" ] || [ "$1" = "--prod" ]; then
    netlify deploy --prod --dir=$BUILD_DIR
  else
    netlify deploy --dir=$BUILD_DIR  # preview
  fi

  echo "✅ Deploy Netlify completato"
}

# ── NGINX STATICO ─────────────────────────────────────────────────────────

deploy_nginx() {
  DOMAIN="${2:-tuodominio.com}"
  SERVE_DIR="/var/www/$APP_NAME"

  echo "🚀 Deploy su Nginx ($DOMAIN)..."

  build

  # Copia build sul server
  sudo mkdir -p $SERVE_DIR
  sudo cp -r $BUILD_DIR/* $SERVE_DIR/
  sudo chown -R www-data:www-data $SERVE_DIR

  # Configura Nginx
  sudo tee /etc/nginx/sites-available/$APP_NAME << NGINXEOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    root $SERVE_DIR;
    index index.html;

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml image/svg+xml;

    # Cache asset statici (hash nel filename — safe immutable)
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA routing — serve index.html per tutti i path
    location / {
        try_files \$uri \$uri/ /index.html;
        add_header X-Frame-Options        "DENY";
        add_header X-Content-Type-Options "nosniff";
        add_header Referrer-Policy        "strict-origin-when-cross-origin";
    }

    # Blocca accesso a file nascosti
    location ~ /\. { deny all; }
}
NGINXEOF

  sudo ln -sf /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/
  sudo nginx -t && sudo systemctl reload nginx

  # HTTPS
  echo "Vuoi configurare HTTPS con Let's Encrypt? [y/N]"
  read -r HTTPS
  if [ "$HTTPS" = "y" ]; then
    sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN
  fi

  echo "✅ Deploy Nginx completato su http://$DOMAIN"
}

# ── COMANDI TEST IN LOCALE ────────────────────────────────────────────────

local_dev() {
  echo "🔧 Avvio ambiente di sviluppo locale..."
  echo ""
  echo "Frontend (React + Vite):    npm run dev        → http://localhost:5173"
  echo "Preview build produzione:   npm run preview    → http://localhost:4173"
  echo "Test unitari:               npx vitest         → watch mode"
  echo "Test unitari con UI:        npx vitest --ui    → interfaccia grafica"
  echo "Test E2E Playwright:        npx playwright test"
  echo "E2E con UI:                 npx playwright test --ui"
  echo "Type check:                 npx tsc --noEmit"
  echo "Lint:                       npm run lint"
  echo ""
  npm run dev
}

# ── GITHUB ACTIONS CI/CD ─────────────────────────────────────────────────

generate_cicd() {
  mkdir -p .github/workflows

  cat > .github/workflows/deploy-web.yml << 'YAMLEOF'
name: Deploy Web

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npx tsc --noEmit
      - run: npm run lint
      - run: npx vitest run
      - name: E2E tests
        run: |
          npx playwright install --with-deps chromium
          npx playwright test
        env:
          VITE_SUPABASE_URL:      ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npm run build
        env:
          VITE_SUPABASE_URL:            ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY:       ${{ secrets.VITE_SUPABASE_ANON_KEY }}
          VITE_STRIPE_PUBLISHABLE_KEY:  ${{ secrets.VITE_STRIPE_PUBLISHABLE_KEY }}
          VITE_GOOGLE_MAPS_API_KEY:     ${{ secrets.VITE_GOOGLE_MAPS_API_KEY }}
      - name: Deploy su Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token:   ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id:  ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args:    '--prod'
YAMLEOF

  echo "✅ GitHub Actions workflow creato in .github/workflows/deploy-web.yml"
  echo "   Aggiungi i secrets nel repository: Settings → Secrets and variables → Actions"
}

# ── MAIN ──────────────────────────────────────────────────────────────────

case "$1" in
  vercel)  deploy_vercel "$2"   ;;
  netlify) deploy_netlify "$2"  ;;
  nginx)   deploy_nginx "$2"    ;;
  build)   build                ;;
  dev)     local_dev            ;;
  cicd)    generate_cicd        ;;
  *)
    echo "Uso: $0 {vercel|netlify|nginx|build|dev|cicd}"
    echo ""
    echo "  vercel   — Deploy su Vercel (consigliato, zero-config)"
    echo "  netlify  — Deploy su Netlify"
    echo "  nginx    — Deploy su server Nginx"
    echo "  build    — Solo build locale"
    echo "  dev      — Avvia ambiente sviluppo locale"
    echo "  cicd     — Genera GitHub Actions workflow"
    exit 1
    ;;
esac
