#!/usr/bin/env bash
# ==============================================================================
# SCRIPT DE DESPLIEGUE EC2 BACKEND — DULCE ARTE (EVA 4 ARQUITECTURA DISTRIBUIDA)
# Stack: Ubuntu 22.04/24.04 + Nginx + Gunicorn + Django REST Framework + JWT
# Base de datos externa: Amazon RDS PostgreSQL (separada de esta EC2)
# Estáticos / Media: Amazon S3 (o WhiteNoise local si USE_S3=False)
# ==============================================================================
set -euo pipefail

APP_DIR=$(pwd)
echo "=================================================================="
echo "🎂 Desplegando EC2 BACKEND de DULCE ARTE (EVA 4 AWS)..."
echo "=================================================================="

# 1. Obtener IP Pública de esta EC2 (IMDSv2 / IMDSv1)
TOKEN=$(curl -s -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600" || true)
if [ -n "$TOKEN" ]; then
    PUBLIC_IP=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/public-ipv4 || echo "localhost")
else
    PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 || echo "localhost")
fi
echo "🌐 IP Pública EC2 Backend: $PUBLIC_IP"

# 2. Instalar dependencias del sistema (SIN PostgreSQL local, porque vive en RDS)
sudo apt-get update -y
sudo apt-get install -y python3-pip python3-venv python3-dev libpq-dev postgresql-client nginx curl

# 3. Verificar o crear archivo .env para RDS, S3, CORS y JWT
if [ ! -f "$APP_DIR/.env" ]; then
    echo "⚙️  No existe .env en $APP_DIR. Ingresa los parámetros de tu infraestructura AWS:"
    read -rp "Endpoint de Amazon RDS PostgreSQL (DB_HOST): " INPUT_DB_HOST
    read -rp "Nombre BD RDS [dulce_arte_db]: " INPUT_DB_NAME
    INPUT_DB_NAME=${INPUT_DB_NAME:-dulce_arte_db}
    read -rp "Usuario RDS [postgres]: " INPUT_DB_USER
    INPUT_DB_USER=${INPUT_DB_USER:-postgres}
    read -rsp "Contraseña RDS: " INPUT_DB_PASS
    echo ""
    read -rp "Nombre Bucket S3 (dejar vacío si usarás WhiteNoise inicialmente): " INPUT_S3_BUCKET
    read -rp "URL pública EC2 Frontend (ej. http://54.x.x.x): " INPUT_FRONTEND_URL
    read -rp "URL Invoke API Gateway (opcional, ej. https://abc.execute-api.us-east-1.amazonaws.com): " INPUT_APIGW_URL

    GEN_SECRET=$(python3 -c "import secrets; print(secrets.token_urlsafe(50))")
    USE_S3_VAL="False"
    if [ -n "$INPUT_S3_BUCKET" ]; then
        USE_S3_VAL="True"
    fi

    CORS_ORIGINS="http://localhost:5173"
    [ -n "$INPUT_FRONTEND_URL" ] && CORS_ORIGINS="$CORS_ORIGINS,$INPUT_FRONTEND_URL"
    [ -n "$INPUT_APIGW_URL" ] && CORS_ORIGINS="$CORS_ORIGINS,$INPUT_APIGW_URL"

    cat > "$APP_DIR/.env" <<EOF
SECRET_KEY=$GEN_SECRET
DEBUG=False
ALLOWED_HOSTS=localhost,127.0.0.1,$PUBLIC_IP,*
CSRF_TRUSTED_ORIGINS=http://localhost,http://$PUBLIC_IP${INPUT_FRONTEND_URL:+,$INPUT_FRONTEND_URL}${INPUT_APIGW_URL:+,$INPUT_APIGW_URL}
CORS_ALLOWED_ORIGINS=$CORS_ORIGINS
CORS_ALLOW_ALL_ORIGINS=False
USE_HTTPS=False

DB_ENGINE=postgresql
DB_NAME=$INPUT_DB_NAME
DB_USER=$INPUT_DB_USER
DB_PASSWORD=$INPUT_DB_PASS
DB_HOST=$INPUT_DB_HOST
DB_PORT=5432
DB_SSLMODE=require

USE_S3=$USE_S3_VAL
AWS_STORAGE_BUCKET_NAME=$INPUT_S3_BUCKET
AWS_S3_REGION_NAME=us-east-1
AWS_S3_STATIC_QUERYSTRING_AUTH=True

AWS_EC2_PUBLIC_IP=$PUBLIC_IP
EOF
    chmod 600 "$APP_DIR/.env"
    echo "✅ Archivo .env creado con permisos 600."
fi

# 4. Entorno Virtual Python e Instalación de Dependencias
python3 -m venv "$APP_DIR/venv"
"$APP_DIR/venv/bin/pip" install --upgrade pip
"$APP_DIR/venv/bin/pip" install -r "$APP_DIR/requirements.txt"

# 5. Migraciones contra Amazon RDS, Seed inicial, Estáticos (S3 o local) y Verificación
"$APP_DIR/venv/bin/python" "$APP_DIR/manage.py" migrate --noinput
"$APP_DIR/venv/bin/python" "$APP_DIR/manage.py" seed_dulce_arte
"$APP_DIR/venv/bin/python" "$APP_DIR/manage.py" collectstatic --noinput
"$APP_DIR/venv/bin/python" "$APP_DIR/manage.py" verificar_seguridad

# 6. Configurar Gunicorn con Systemd
USER_ACTUAL=$(whoami)
sudo bash -c "cat > /etc/systemd/system/dulce_arte_backend.service" <<EOF
[Unit]
Description=Gunicorn Daemon Dulce Arte API Backend (EVA 4)
After=network.target

[Service]
User=$USER_ACTUAL
Group=www-data
WorkingDirectory=$APP_DIR
EnvironmentFile=$APP_DIR/.env
ExecStart=$APP_DIR/venv/bin/gunicorn --workers 3 --bind 127.0.0.1:8000 dulce_arte_project.wsgi:application
Restart=always

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable dulce_arte_backend
sudo systemctl restart dulce_arte_backend

# 7. Copiar assets locales de Swagger UI (evita JS cross-domain / faltantes SRI) y configurar Nginx
SIDECAR_DIR=$("$APP_DIR/venv/bin/python" -c "import drf_spectacular_sidecar, pathlib; print(pathlib.Path(drf_spectacular_sidecar.__file__).parent / 'static' / 'drf_spectacular_sidecar')")
sudo mkdir -p /var/www/swagger_assets
sudo rm -rf /var/www/swagger_assets/*
sudo cp -r "$SIDECAR_DIR"/* /var/www/swagger_assets/

sudo bash -c "cat > /etc/nginx/sites-available/dulce_arte_backend" <<EOF
server {
    listen 80;
    server_name $PUBLIC_IP _;
    server_tokens off;
    client_max_body_size 15M;

    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "same-origin" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none';" always;

    location /swagger-assets/ {
        alias /var/www/swagger_assets/;
    }

    location /static/ {
        alias $APP_DIR/staticfiles/;
    }

    location /media/ {
        alias $APP_DIR/media/;
    }

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_hide_header X-Frame-Options;
        proxy_hide_header X-Content-Type-Options;
        proxy_hide_header Referrer-Policy;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/dulce_arte_backend /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

echo "=================================================================="
echo "✅ EC2 BACKEND DESPLEGADO EXITOSAMENTE"
echo "🩺 Healthcheck    : http://$PUBLIC_IP/api/v1/health/"
echo "📘 Swagger Docs   : http://$PUBLIC_IP/api/v1/docs/"
echo "🔑 JWT Token      : http://$PUBLIC_IP/api/v1/auth/token/"
echo "=================================================================="
