# Guía de Despliegue y Evidencias AWS — Evaluación N.º 4 (Dulce Arte)

Esta guía resume el orden exacto para levantar la arquitectura obligatoria en **AWS Academy** y reunir las capturas verificables para la defensa de 5 minutos.

---

## Orden recomendado de despliegue en AWS

### Paso 1: Amazon RDS PostgreSQL (Actividad 5 y 8)
> **Importante:** Habilita el cifrado en reposo **al momento de crear** la instancia RDS; no se puede activar después con un interruptor sin migrar mediante snapshot cifrado.

1. Ir a **RDS → Create database → Standard create → PostgreSQL** (Free tier / `db.t3.micro` o `db.t4g.micro`).
2. Configurar:
   * **DB instance identifier:** `dulce-arte-rds`
   * **Master username:** `postgres` (y contraseña segura).
   * **Initial database name:** `dulce_arte_db` (en *Additional configuration*).
   * **Encryption:** marcar **Enable encryption** (KMS default `aws/rds`).
   * **Automated backups:** habilitar retención (ej. 1 a 7 días).
   * **Public access:** `No` si está en la misma VPC que la EC2 Backend (o `Yes` solo si conectarás desde pgAdmin local restringiendo por IP).
3. En el **Security Group de RDS**, configurar **Inbound Rules**:
   * **Type:** PostgreSQL (`TCP 5432`)
   * **Source:** **solo el Security Group de la EC2 Backend** (nunca `0.0.0.0/0`).
4. **Snapshot manual (Actividad 8):** Una vez creada la BD, ir a *Actions → Take snapshot* (`dulce-arte-snap-inicial`).
   * **Capturas para evidencia:** Detalle de RDS mostrando Endpoint, *Encryption: Enabled*, *Security Group puerto 5432* restringido a la EC2 Backend, *Automated backups*, y el *Manual snapshot*.

---

### Paso 2: Amazon S3 (Actividad 6)
1. Ir a **S3 → Create bucket**:
   * **Bucket name:** ej. `dulce-arte-static-renato-2026` (único globalmente).
   * **Block Public Access settings:** dejar **activado** (*Block all public access*). El proyecto sirve los archivos mediante **URLs prefirmadas** (`AWS_S3_STATIC_QUERYSTRING_AUTH=True`) usando credenciales IAM o política controlada.
   * **Default encryption:** **Server-side encryption with Amazon S3 managed keys (SSE-S3)** o **SSE-KMS**.
   * **Bucket Versioning:** opcionalmente habilitar *Versioning* para diferenciar cifrado, control de acceso y versionado.
2. **Permisos IAM:**
   * En AWS Academy, si puedes asignar un *IAM Role* (`LabInstanceProfile` o rol con permiso `AmazonS3FullAccess`/política acotada al bucket) a la EC2 Backend, `boto3` lo usará automáticamente sin llaves en `.env`.
   * Si usas credenciales temporales de laboratorio, exporta `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` y `AWS_SESSION_TOKEN` o define una política controlada.
3. **Capturas para evidencia:** Propiedades del bucket (SSE-S3/SSE-KMS, Block Public Access), lista de objetos subidos tras `collectstatic` (`static/` y/o `media/`), y URL prefirmada cargando desde el navegador/curl.

---

### Paso 3: EC2 Backend — Django REST Framework (Actividad 1 y 3)
1. Lanzar instancia **Ubuntu 22.04 / 24.04 LTS** (`t3.small` o `t3.micro`).
2. **Security Group EC2 Backend:**
   * `22` (SSH desde tu IP).
   * `80` (HTTP desde Internet/API Gateway).
   * *(Asegúrate de incluir este SG en la regla de entrada puerto `5432` del SG de RDS).*
3. Conectarse por SSH, clonar el repositorio y ejecutar:
   ```bash
   git clone https://github.com/Rena885/Eva_4_backend.git dulce_arte
   cd dulce_arte
   chmod +x deploy/deploy_backend_ec2.sh
   ./deploy/deploy_backend_ec2.sh
   ```
   *(Ingresa el Endpoint RDS, contraseña, nombre del bucket S3, etc. cuando lo solicite).*
4. Verificar ejecución:
   ```bash
   curl http://localhost/api/v1/health/
   ./venv/bin/python manage.py verificar_seguridad
   ```
   * **Capturas para evidencia:** Salida de `verificar_seguridad` (muestra `argon2` en BD sin texto plano y conexión exitosa a `rds.amazonaws.com`) y Swagger UI en `http://<IP_BACKEND>/api/v1/docs/`.

---

### Paso 4: Amazon API Gateway + Rate Limiting (Actividad 4)
> **Requisito crítico:** La pauta indica: *"debe demostrar el rate limit, no solo el acceso a una URL directa a EC2."*

1. Ir a **API Gateway → Create API → HTTP API** (más liviana y directa para proxy HTTP) o **REST API**.
   * *Justificación sugerida:* **HTTP API** ofrece menor latencia y menor costo cuando ya manejamos autenticación JWT en Django (`SimpleJWT`), mientras **REST API** ofrece funciones avanzadas como Usage Plans, API Keys y transformación de payloads; para integrar un backend EC2 con throttling por ruta/stage, HTTP API (o REST API con throttling en Stage) cumple el objetivo.
2. **Integración:**
   * Ruta `ANY /{proxy+}` (y `GET /api/v1/health/`) apuntando a `http://<IP_PUBLICA_EC2_BACKEND>/{proxy}` (integración HTTP proxy).
   * Configurar **CORS** en API Gateway (o dejar pasar las cabeceras hacia Django `corsheaders`: `Authorization`, `Content-Type`, métodos `GET,POST,PUT,PATCH,DELETE,OPTIONS`).
3. **Configurar Throttling / Rate Limiting:**
   * Ir a **Stages → `$default` (o `prod`) → Route throttling / Default route throttling**:
   * **Rate limit:** `2` solicitudes/segundo
   * **Burst limit:** `5` solicitudes
4. **Probar Rate Limit (HTTP `429 Too Many Requests`):**
   * En el frontend (pestaña **JWT & Rate Limit → Lanzar Ráfaga**) o desde terminal:
     ```bash
     for i in {1..15}; do curl -s -o /dev/null -w "Req $i: %{http_code}\n" https://<TU_API_ID>.execute-api.us-east-1.amazonaws.com/api/v1/health/; done
     ```
   * **Capturas para evidencia:** Configuración de throttling en consola API Gateway + salida mostrando códigos `200` y `429`.

---

### Paso 5: EC2 Frontend — React + Vite + Nginx (Actividad 1)
1. Lanzar una segunda instancia **Ubuntu 22.04 / 24.04 LTS** (`t3.micro`) con Security Group abriendo puerto `22` (SSH) y `80` (HTTP).
2. Conectarse por SSH, clonar el repositorio y ejecutar:
   ```bash
   git clone https://github.com/Rena885/Eva_4_backend.git dulce_arte
   cd dulce_arte
   chmod +x deploy/deploy_frontend_ec2.sh
   ./deploy/deploy_frontend_ec2.sh
   ```
   *(Cuando solicite la URL del API Gateway, pegar `https://<TU_API_ID>.execute-api.us-east-1.amazonaws.com` sin `/` al final).*
3. **Actualizar CORS en EC2 Backend:** En la EC2 Backend agrega `http://<IP_EC2_FRONTEND>` a `CORS_ALLOWED_ORIGINS` en `.env` y reinicia Gunicorn:
   ```bash
   sudo systemctl restart dulce_arte_backend
   ```
4. **Prueba End-to-End de defensa (1:00 min):**
   * Abre `http://<IP_EC2_FRONTEND>/`, inicia sesión con JWT (`admin` / `dulcearte2026`), crea o edita un cliente en **Clientes CRUD**, verifica `POST 201` / `PATCH 200`, y muestra el registro persistido en PostgreSQL RDS (o recargando la vista / consultando `psql` / Django Admin).

---

### Paso 6: Amazon CloudWatch + Alarma (Actividad 7)
1. Ir a **CloudWatch → Metrics → EC2 → Per-Instance Metrics**.
2. Seleccionar la instancia **EC2 Backend** y revisar `CPUUtilization`, `NetworkIn`, `NetworkOut`.
3. Ir a **Alarms → All alarms → Create alarm**:
   * Métrica: `CPUUtilization` de EC2 Backend.
   * Condición: `Greater > 70%` durante 1 período de 5 minutos.
   * Notificación: Crear o seleccionar tópico **Amazon SNS** con tu correo (confirmar suscripción en tu email si AWS Academy lo permite).
4. **Capturas para evidencia:** Gráfica de métricas EC2 + alarma creada y habilitada.

---

### Paso 7: Análisis SAST (SonarQube) y DAST (OWASP ZAP) (Actividad 2)

#### SonarQube (SAST — Análisis Estático de Código)
Puedes correr SonarQube localmente con Docker sobre tu código backend (usando [sonar-project.properties](../sonar-project.properties)):
```bash
# 1. Levantar SonarQube local con Docker
docker run -d --name sonarqube -p 9000:9000 sonarqube:lts-community

# 2. En http://localhost:9000 crear proyecto 'dulce-arte-backend-eva4' y generar token
# 3. Ejecutar sonar-scanner desde la raíz del proyecto
sonar-scanner -Dsonar.host.url=http://localhost:9000 -Dsonar.token=<TU_TOKEN>
```
*Documenta al menos 1 hallazgo real (ej. algún warning de complejidad o seguridad o regla de calidad en código Python) y cómo lo corregiste o justificaste.*

#### OWASP ZAP (DAST — Análisis Dinámico sobre la app desplegada)
Ejecuta **ZAP Baseline Scan** (exploración pasiva segura sobre tu entorno autorizado en AWS):
```bash
# Sobre el Backend o Frontend desplegado
docker run --rm -t ghcr.io/zaproxy/zaproxy:stable zap-baseline.py -t http://<IP_EC2_BACKEND>/api/v1/health/ -r zap_report.html
```
*(También puedes usar la interfaz de escritorio de OWASP ZAP en Windows ejecutando Automated Scan / Passive Scan sobre tu URL desplegada).*
*Analiza al menos 1 alerta reportada (por ejemplo cabeceras como `Content-Security-Policy` o `Permissions-Policy`) y agrega el cuadro comparativo entre SAST y DAST en tu informe técnico.*
