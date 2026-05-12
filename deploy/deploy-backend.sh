#!/bin/bash
# =============================================================
# deploy-backend.sh — Deploy Backend Node.js su server Linux
# =============================================================
# Esegui una sola volta sul server per il setup iniziale,
# poi usa il comando di update per i deploy successivi.
#
# Presuppone: Ubuntu 22.04 LTS, accesso SSH con sudo
#
# Utilizzo:
#   chmod +x deploy-backend.sh
#   ./deploy-backend.sh setup     # primo deploy
#   ./deploy-backend.sh update    # aggiornamenti successivi
#   ./deploy-backend.sh rollback  # torna alla versione precedente

set -e  # interrompi su errore

APP_NAME="mia-app-backend"
APP_DIR="/var/www/$APP_NAME"
REPO_URL="https://github.com/tuo-user/tuo-repo.git"
BRANCH="main"
NODE_VERSION="20"
PORT=3000

# ── SETUP INIZIALE ─────────────────────────────────────────────────────────

setup() {
  echo "🚀 Setup iniziale backend..."

  # 1. Aggiorna sistema
  sudo apt-get update && sudo apt-get upgrade -y

  # 2. Installa Node.js via nvm (versione stabile)
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
  source ~/.bashrc
  nvm install $NODE_VERSION
  nvm use $NODE_VERSION
  nvm alias default $NODE_VERSION

  # 3. Installa PM2 (process manager)
  npm install -g pm2

  # 4. Installa Nginx (reverse proxy)
  sudo apt-get install -y nginx certbot python3-certbot-nginx

  # 5. Clona il repository
  sudo mkdir -p $APP_DIR
  sudo chown $USER:$USER $APP_DIR
  git clone --branch $BRANCH $REPO_URL $APP_DIR
  cd $APP_DIR

  # 6. Installa dipendenze
  npm ci --production

  # 7. Crea file .env (da compilare manualmente)
  if [ ! -f "$APP_DIR/.env" ]; then
    cat > $APP_DIR/.env << 'ENVEOF'
SUPABASE_URL=https://xyzxyz.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_ANON_KEY=eyJ...
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
AWS_REGION=eu-south-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=xxx
AWS_S3_BUCKET=mio-bucket
PORT=3000
NODE_ENV=production
ALLOWED_ORIGINS=https://tuodominio.com
CLIENT_URL=https://tuodominio.com
EXPO_ACCESS_TOKEN=xxx
ENVEOF
    echo "⚠️  Compila il file $APP_DIR/.env con i valori reali prima di continuare"
    exit 1
  fi

  # 8. Configura PM2
  cat > $APP_DIR/ecosystem.config.js << 'PMEOF'
module.exports = {
  apps: [{
    name:          'mia-app-backend',
    script:        'src/server.js',
    instances:     'max',          // un processo per CPU
    exec_mode:     'cluster',      // load balancing
    autorestart:   true,
    watch:         false,
    max_memory_restart: '500M',
    env_production: {
      NODE_ENV: 'production',
    },
    // Log
    error_file: '/var/log/pm2/mia-app-error.log',
    out_file:   '/var/log/pm2/mia-app-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
  }],
}
PMEOF

  mkdir -p /var/log/pm2

  # 9. Avvia con PM2
  cd $APP_DIR
  pm2 start ecosystem.config.js --env production
  pm2 save
  pm2 startup  # configura avvio automatico al riavvio server

  # 10. Configura Nginx
  sudo tee /etc/nginx/sites-available/$APP_NAME << 'NGINXEOF'
server {
    listen 80;
    server_name api.tuodominio.com;

    # Gzip compression
    gzip on;
    gzip_types application/json text/plain;

    # Rate limiting (layer aggiuntivo prima di Express)
    limit_req_zone $binary_remote_addr zone=api:10m rate=30r/m;
    limit_req zone=api burst=10 nodelay;

    location / {
        proxy_pass         http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
        client_max_body_size 20M;
    }

    # Health check endpoint (no rate limit)
    location /health {
        proxy_pass http://localhost:3000/health;
        limit_req  off;
    }
}
NGINXEOF

  sudo ln -sf /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/
  sudo nginx -t && sudo systemctl reload nginx

  # 11. HTTPS con Let's Encrypt
  # sudo certbot --nginx -d api.tuodominio.com --non-interactive --agree-tos -m tuo@email.com

  echo "✅ Backend in esecuzione su http://localhost:$PORT"
  echo "   Configura il DNS: api.tuodominio.com → IP del server"
  echo "   Poi lancia: sudo certbot --nginx -d api.tuodominio.com"
}

# ── UPDATE ─────────────────────────────────────────────────────────────────

update() {
  echo "🔄 Aggiornamento backend..."

  cd $APP_DIR

  # Backup versione corrente
  git stash 2>/dev/null || true
  PREV_COMMIT=$(git rev-parse HEAD)

  # Pull nuova versione
  git fetch origin $BRANCH
  git checkout $BRANCH
  git pull origin $BRANCH

  # Installa nuove dipendenze (se cambiate)
  npm ci --production

  # Riavvia con zero downtime (graceful reload)
  pm2 reload ecosystem.config.js --env production

  echo "✅ Update completato (da $PREV_COMMIT a $(git rev-parse HEAD))"
}

# ── ROLLBACK ──────────────────────────────────────────────────────────────

rollback() {
  echo "⏪ Rollback alla versione precedente..."
  cd $APP_DIR
  git log --oneline -5
  read -p "Inserisci il commit hash a cui tornare: " COMMIT
  git checkout $COMMIT
  npm ci --production
  pm2 reload ecosystem.config.js --env production
  echo "✅ Rollback a $COMMIT completato"
}

# ── LOG E STATUS ──────────────────────────────────────────────────────────

status() {
  pm2 status
  pm2 monit
}

logs() {
  pm2 logs $APP_NAME --lines 100
}

# ── MAIN ──────────────────────────────────────────────────────────────────

case "$1" in
  setup)    setup    ;;
  update)   update   ;;
  rollback) rollback ;;
  status)   status   ;;
  logs)     logs     ;;
  *)
    echo "Uso: $0 {setup|update|rollback|status|logs}"
    echo ""
    echo "  setup    — Primo deploy (installa Node, PM2, Nginx)"
    echo "  update   — Aggiorna a ultima versione (zero downtime)"
    echo "  rollback — Torna a versione precedente"
    echo "  status   — Mostra stato processi PM2"
    echo "  logs     — Tail log applicazione"
    exit 1
    ;;
esac
