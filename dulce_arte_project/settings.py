"""
Configuración de Django para el Proyecto Dulce Arte (Adaptado a Evaluación 4 - AWS):
- API RESTful con Django REST Framework + JWT (SimpleJWT) + OpenAPI (drf-spectacular)
- CORS habilitado para arquitectura distribuida (EC2 Frontend -> API Gateway -> EC2 Backend)
- Seguridad de contraseñas reforzada con Argon2 + PBKDF2
- Base de datos PostgreSQL separada en Amazon RDS (con soporte TLS vía DB_SSLMODE)
- Almacenamiento de estáticos y media en Amazon S3 (con URLs prefirmadas / cifrado en reposo)
"""

import os
from datetime import timedelta
from pathlib import Path
from dotenv import load_dotenv
from django.core.management.utils import get_random_secret_key

# Construcción de rutas dentro del proyecto
BASE_DIR = Path(__file__).resolve().parent.parent

# Carga de variables de entorno desde archivo .env
load_dotenv(BASE_DIR / '.env')

# Seguridad y entorno
SECRET_KEY = os.getenv('SECRET_KEY') or get_random_secret_key()

DEBUG = os.getenv('DEBUG', 'False').lower() in ('true', '1', 'yes')

ALLOWED_HOSTS = [
    host.strip()
    for host in os.getenv('ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')
    if host.strip()
]

CSRF_TRUSTED_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        'CSRF_TRUSTED_ORIGINS',
        'http://localhost:8000,http://127.0.0.1:8000,http://localhost:5173,http://127.0.0.1:5173',
    ).split(',')
    if origin.strip()
]

# Definición de aplicaciones
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.humanize',
    # Librerías de terceros (API REST, JWT, CORS, Documentación y AWS S3)
    'corsheaders',
    'rest_framework',
    'rest_framework.authtoken',
    'rest_framework_simplejwt',
    'django_filters',
    'drf_spectacular',
    'storages',
    # Aplicación principal del dominio Dulce Arte
    'gestion_pasteleria.apps.GestionPasteleriaConfig',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'dulce_arte_project.urls'

# Configuración de Templates (mantiene compatibilidad con panel SSR y Django Admin)
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
                'gestion_pasteleria.context_processors.dulce_arte_kpis',
            ],
        },
    },
]

WSGI_APPLICATION = 'dulce_arte_project.wsgi.application'

# ==============================================================================
# CONFIGURACIÓN DE BASE DE DATOS RELACIONAL POSTGRESQL (Local / Amazon RDS)
# ==============================================================================
DB_ENGINE = os.getenv('DB_ENGINE', 'postgresql').lower()
DB_NAME = os.getenv('DB_NAME', 'dulce_arte_db')
DB_USER = os.getenv('DB_USER', 'postgres')
DB_PASSWORD = os.getenv('DB_PASSWORD', '')
DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_PORT = os.getenv('DB_PORT', '5432')
DB_SSLMODE = os.getenv('DB_SSLMODE', '').strip()

if DB_ENGINE in ('postgresql', 'postgres', 'django.db.backends.postgresql'):
    PG_OPTIONS = {'connect_timeout': 10}
    if DB_SSLMODE:
        PG_OPTIONS['sslmode'] = DB_SSLMODE
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': DB_NAME,
            'USER': DB_USER,
            'PASSWORD': DB_PASSWORD,
            'HOST': DB_HOST,
            'PORT': DB_PORT,
            'CONN_MAX_AGE': 60,
            'OPTIONS': PG_OPTIONS,
        }
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

# ==============================================================================
# SEGURIDAD DE CONTRASEÑAS (Actividad 3: Argon2 + PBKDF2 con Salt automático)
# ==============================================================================
PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.Argon2PasswordHasher',
    'django.contrib.auth.hashers.PBKDF2PasswordHasher',
    'django.contrib.auth.hashers.PBKDF2SHA1PasswordHasher',
    'django.contrib.auth.hashers.BCryptSHA256PasswordHasher',
]

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator', 'OPTIONS': {'min_length': 8}},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# Configuración de Sesiones, Cabeceras HTTP y Protección (OWASP ZAP / SonarQube)
LOGIN_URL = 'login'
LOGIN_REDIRECT_URL = 'dashboard'
LOGOUT_REDIRECT_URL = 'login'

SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'
SESSION_COOKIE_AGE = 60 * 60 * 8
SESSION_SAVE_EVERY_REQUEST = True
CSRF_COOKIE_HTTPONLY = True  # Protege cookie CSRF frente a lectura JS (OWASP ZAP)
CSRF_COOKIE_SAMESITE = 'Lax'

SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
REFERRER_POLICY = 'same-origin'

USE_HTTPS = os.getenv('USE_HTTPS', 'False').lower() in ('true', '1', 'yes')
USE_X_FORWARDED_HOST = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
if USE_HTTPS:
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True

# ==============================================================================
# CORS PARA FRONTEND DESACOPLADO (EC2 FRONTEND) Y API GATEWAY
# ==============================================================================
CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        'CORS_ALLOWED_ORIGINS',
        'http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000',
    ).split(',')
    if origin.strip()
]
CORS_ALLOW_ALL_ORIGINS = os.getenv('CORS_ALLOW_ALL_ORIGINS', 'False').lower() in ('true', '1', 'yes')
CORS_ALLOW_CREDENTIALS = True

# ==============================================================================
# DJANGO REST FRAMEWORK, JWT (SIMPLEJWT) Y OPENAPI (DRF-SPECTACULAR)
# ==============================================================================
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'rest_framework.authentication.SessionAuthentication',
        'rest_framework.authentication.TokenAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 25,
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=int(os.getenv('JWT_ACCESS_MINUTES', '60'))),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=int(os.getenv('JWT_REFRESH_DAYS', '1'))),
    'ROTATE_REFRESH_TOKENS': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'TOKEN_OBTAIN_SERIALIZER': 'gestion_pasteleria.serializers.CustomTokenObtainPairSerializer',
}

SPECTACULAR_SETTINGS = {
    'TITLE': 'Dulce Arte API RESTful — Evaluación 4',
    'DESCRIPTION': (
        'API RESTful de Pastelería Artesanal Dulce Arte: Cotizaciones BOM, Tablero Kanban, '
        'Inventario de Bodega y Rutas de Despacho. Protegida con JWT, RBAC, PostgreSQL RDS y AWS S3.'
    ),
    'VERSION': '2.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
}

# Internacionalización y Zona Horaria (Chile)
LANGUAGE_CODE = 'es-cl'
TIME_ZONE = 'America/Santiago'
USE_I18N = True
USE_TZ = True

# ==============================================================================
# ARCHIVOS ESTÁTICOS Y MULTIMEDIA (Local con WhiteNoise o AWS S3 en Producción)
# ==============================================================================
STATICFILES_DIRS = [BASE_DIR / 'static']
STATIC_ROOT = BASE_DIR / 'staticfiles'
MEDIA_ROOT = BASE_DIR / 'media'

USE_S3 = os.getenv('USE_S3', 'False').lower() in ('true', '1', 'yes')
if USE_S3:
    AWS_STORAGE_BUCKET_NAME = os.getenv('AWS_STORAGE_BUCKET_NAME', '')
    AWS_S3_REGION_NAME = os.getenv('AWS_S3_REGION_NAME', 'us-east-1')
    AWS_DEFAULT_ACL = None
    AWS_S3_SIGNATURE_VERSION = 's3v4'
    AWS_S3_FILE_OVERWRITE = False
    AWS_S3_OBJECT_PARAMETERS = {'CacheControl': 'max-age=86400'}
    AWS_S3_STATIC_QUERYSTRING_AUTH = (
        os.getenv('AWS_S3_STATIC_QUERYSTRING_AUTH', 'True').lower() in ('true', '1', 'yes')
    )
    _s3_custom_domain = os.getenv('AWS_S3_CUSTOM_DOMAIN', '').strip()
    if _s3_custom_domain:
        AWS_S3_CUSTOM_DOMAIN = _s3_custom_domain
        STATIC_URL = f'https://{_s3_custom_domain}/static/'
        MEDIA_URL = f'https://{_s3_custom_domain}/media/'
    else:
        STATIC_URL = f'https://{AWS_STORAGE_BUCKET_NAME}.s3.{AWS_S3_REGION_NAME}.amazonaws.com/static/'
        MEDIA_URL = f'https://{AWS_STORAGE_BUCKET_NAME}.s3.{AWS_S3_REGION_NAME}.amazonaws.com/media/'

    STORAGES = {
        'default': {
            'BACKEND': 'storages.backends.s3.S3Storage',
            'OPTIONS': {
                'location': 'media',
                'querystring_auth': True,
                'default_acl': None,
            },
        },
        'staticfiles': {
            'BACKEND': 'storages.backends.s3.S3Storage',
            'OPTIONS': {
                'location': 'static',
                'querystring_auth': AWS_S3_STATIC_QUERYSTRING_AUTH,
                'default_acl': None,
            },
        },
    }
else:
    STATIC_URL = '/static/'
    MEDIA_URL = '/media/'
    STORAGES = {
        'default': {
            'BACKEND': 'django.core.files.storage.FileSystemStorage',
        },
        'staticfiles': {
            'BACKEND': 'whitenoise.storage.CompressedManifestStaticFilesStorage',
        },
    }

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Metadatos del sistema expuestos en la interfaz
AWS_EC2_PUBLIC_IP = os.getenv('AWS_EC2_PUBLIC_IP', 'Instancia EC2 AWS Academy')
