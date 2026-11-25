#!/usr/bin/env bash
# ==============================================================================
# SCRIPT DE DESPLIEGUE EC2 FRONTEND — DULCE ARTE SPA (EVA 4 AWS)
# Stack: Ubuntu 22.04/24.04 + Node.js 22 + Vite/React/Tailwind + Nginx Puerto 80
# Se conecta vía HTTP/JSON + JWT hacia la URL Invoke de Amazon API Gateway
# ==============================================================================
set -euo pipefail

APP_DIR=$(pwd)
FRONTEND_DIR="$APP_DIR/frontend"

echo "=================================================================="
echo "🎨 Desplegando EC2 FRONTEND de DULCE ARTE (React + Vite + Nginx)..."
echo "=================================================================="

if [ ! -d "$FRONTEND_DIR" ]; then
    echo "❌ Error: No se encontró el directorio $FRONTEND_DIR."
    exit 1
fi

read -rp "URL base de API Gateway (sin / al final, ej. https://abc123.execute-api.us-east-1.amazonaws.com): " API_GW_URL
API_GW_URL=${API_GW_URL%/}

# 1. Instalar Nginx y Node.js 22 LTS si no están presentes
sudo apt-get update -y
sudo apt-get install -y nginx curl

if ! command -v node >/dev/null 2>&1; then
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

echo "📦 Node version: $(node -v) | npm version: $(npm -v)"

# 2. Configurar variable de entorno y compilar bundle de producción
cat > "$FRONTEND_DIR/.env" <<EOF
VITE_API_BASE_URL=$API_GW_URL
EOF

cd "$FRONTEND_DIR"
npm ci || npm install
npm run build

# 3. Publicar archivos estáticos en Nginx
sudo mkdir -p /var/www/dulce-arte-frontend
sudo rm -rf /var/www/dulce-arte-frontend/*
sudo cp -r "$FRONTEND_DIR/dist/"* /var/www/dulce-arte-frontend/

sudo bash -c "cat > /etc/nginx/sites-available/dulce_arte_frontend" <<EOF
server {
    listen 80;
    server_name _;

    root /var/www/dulce-arte-frontend;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/dulce_arte_frontend /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

TOKEN=$(curl -s -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600" || true)
PUBLIC_IP=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/public-ipv4 || echo "IP_EC2_FRONTEND")

echo "=================================================================="
echo "✅ EC2 FRONTEND DESPLEGADO EXITOSAMENTE"
echo "🌐 Frontend Web   : http://$PUBLIC_IP/"
echo "🔗 API conectada  : $API_GW_URL"
echo "=================================================================="
