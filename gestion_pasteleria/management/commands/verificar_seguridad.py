"""
Comando de gestión Django: `python manage.py verificar_seguridad`
Genera evidencia verificable en consola para las Actividades 3, 5 y 6 de EVA 4:
- Configuración de PASSWORD_HASHERS (Argon2 + PBKDF2) y hashes almacenados sin texto plano
- Conectividad y motor PostgreSQL / Amazon RDS
- Estado de almacenamiento estático/media en Amazon S3
"""

import secrets
from django.conf import settings
from django.contrib.auth.hashers import make_password
from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.db import connection


class Command(BaseCommand):
    help = 'Verifica y muestra la configuración de seguridad (Argon2/PBKDF2, RDS PostgreSQL y S3).'

    def handle(self, *args, **options):
        self.stdout.write(self.style.MIGRATE_HEADING('=== VERIFICACIÓN DE SEGURIDAD DULCE ARTE (EVA 4) ==='))

        self.stdout.write('\n[1] Password Hashers configurados (Actividad 3):')
        for idx, hasher in enumerate(settings.PASSWORD_HASHERS, start=1):
            self.stdout.write(f'  {idx}. {hasher}')

        ejemplo_hash = make_password(secrets.token_urlsafe(16))
        partes = ejemplo_hash.split('$')
        self.stdout.write(f'  Ejemplo hash generado con salt automático: {partes[0]}$... (longitud {len(ejemplo_hash)} chars)')

        self.stdout.write('\n[2] Usuarios registrados (prefijo de algoritmo en BD, nunca texto plano):')
        for user in User.objects.order_by('id')[:10]:
            algo = user.password.split('$', 1)[0] if '$' in user.password else 'invalido'
            self.stdout.write(f'  - {user.username:<18} -> algoritmo={algo} | prefix={user.password[:28]}...')

        self.stdout.write('\n[3] Base de Datos Relacional (Actividad 5):')
        db_cfg = settings.DATABASES['default']
        self.stdout.write(f"  ENGINE  : {db_cfg.get('ENGINE')}")
        self.stdout.write(f"  HOST    : {db_cfg.get('HOST', 'localhost')}")
        self.stdout.write(f"  PORT    : {db_cfg.get('PORT', '5432')}")
        self.stdout.write(f"  SSLMODE : {db_cfg.get('OPTIONS', {}).get('sslmode', 'no definido (local)')}")
        with connection.cursor() as cursor:
            cursor.execute('SELECT version();')
            version = cursor.fetchone()[0]
            self.stdout.write(self.style.SUCCESS(f'  CONEXIÓN OK -> {version[:75]}'))

        self.stdout.write('\n[4] Almacenamiento de Estáticos / Media (Actividad 6):')
        self.stdout.write(f"  USE_S3  : {getattr(settings, 'USE_S3', False)}")
        if getattr(settings, 'USE_S3', False):
            self.stdout.write(f"  BUCKET  : {settings.AWS_STORAGE_BUCKET_NAME}")
            self.stdout.write(f"  REGION  : {settings.AWS_S3_REGION_NAME}")
        self.stdout.write(f"  STATIC  : {settings.STORAGES['staticfiles']['BACKEND']}")
        self.stdout.write(f"  MEDIA   : {settings.STORAGES['default']['BACKEND']}")
