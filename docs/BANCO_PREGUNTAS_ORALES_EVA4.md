# Banco de Respuestas para Defensa Oral — Evaluación N.º 4 (Dulce Arte)

Durante la defensa individual (**2:00 minutos** para preguntas), el docente hará **2 preguntas de bloques diferentes**. Cada pregunta vale **5 puntos de exactitud conceptual + 5 puntos de aplicación/justificación en tu proyecto**.

---

## Bloque A: Desarrollo Seguro — SAST y DAST

### 1. ¿Qué es SAST y qué analiza SonarQube en tu proyecto?
* **Concepto:** **SAST** (*Static Application Security Testing*) analiza el código fuente sin ejecutar la aplicación (*caja blanca*), buscando vulnerabilidades (credenciales hardcodeadas, SQL injection, XSS), bugs y problemas de mantenibilidad (*code smells*) en etapas tempranas.
* **En Dulce Arte:** Se ejecuta sobre `dulce_arte_project/` y `gestion_pasteleria/` usando [sonar-project.properties](../sonar-project.properties). Gracias a este enfoque, en [settings.py](../dulce_arte_project/settings.py) eliminamos contraseñas y `SECRET_KEY` fijas en el código usando variables de entorno (`.env`) y `get_random_secret_key()`, además de activar `DEBUG=False` por defecto.

### 2. ¿Qué es DAST y qué analiza OWASP ZAP?
* **Concepto:** **DAST** (*Dynamic Application Security Testing*) evalúa la aplicación **en ejecución** desde el exterior (*caja negra*), simulando peticiones HTTP reales para detectar fallos de configuración del servidor, cabeceras faltantes, CORS mal configurado, cookies inseguras o exposición de endpoints.
* **En Dulce Arte:** Se ejecuta ZAP Baseline / exploración pasiva contra las URLs desplegadas en AWS. Permite validar que el servidor responde con `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: same-origin` y que los endpoints protegidos devuelven `401 Unauthorized` sin JWT.

### 3. Diferencias y limitaciones entre SAST y DAST
* **SAST** ve todo el código fuente (detecta errores lógicos o secretos antes de desplegar), pero **no ve problemas de infraestructura/runtime** (ej. puertos abiertos, CORS en producción o Nginx).
* **DAST** detecta fallos reales de despliegue y cabeceras HTTP en ejecución, pero **no ve el código interno** ni rutas ocultas que no reciba durante el rastreo (*crawling*). Por eso son complementarios.

---

## Bloque B: Criptografía y Contraseñas

### 1. ¿Qué es una función hash y cuáles son sus propiedades?
* **Concepto:** Función matemática determinista que transforma una entrada de tamaño arbitrario en una cadena de longitud fija (*digest*). Propiedades: **unidireccional** (no se puede revertir), **determinista**, **efecto avalancha** (un mínimo cambio altera todo el hash), **resistente a preimagen** y **resistente a colisiones**.

### 2. Diferencias entre Hash, Cifrado y Codificación
* **Codificación** (ej. Base64, usado en nuestra firma digital Canvas): transforma formato para transporte/legibilidad; es **totalmente reversible sin clave**.
* **Cifrado** (ej. AES en RDS/S3 o TLS en tránsito): protege confidencialidad usando una **clave** para cifrar y descifrar (reversible con la clave).
* **Hash** (ej. Argon2, PBKDF2, SHA-256): **irreversible** (unidireccional), ideal para verificar contraseñas o integridad sin conocer el valor original.

### 3. ¿Qué es MD5 y por qué NO sirve para contraseñas?
* **Concepto:** MD5 produce un resumen de 128 bits. Está **criptográficamente roto** (sufre colisiones rápidas) y es **extremadamente veloz** de calcular en GPU, lo que permite ataques de fuerza bruta y tablas arcoíris (*rainbow tables*) a miles de millones de intentos por segundo.

### 4. ¿Qué es SHA y diferencias entre SHA-1, SHA-2 y SHA-3?
* **SHA-1** (160 bits): obsoleto por ataques de colisión prácticos.
* **SHA-2** (ej. SHA-256 / SHA-512): familia segura ampliamente usada para integridad, certificados TLS y como base de PBKDF2-HMAC-SHA256.
* **SHA-3** (Keccak): construcción interna distinta (*esponja* en lugar de Merkle-Damgård), alternativa moderna resistente a ataques de extensión de longitud.
* *(Nota importante)*: SHA puro sigue siendo demasiado rápido para contraseñas sin estiramiento de clave (*key stretching*).

### 5. ¿Qué es un *salt*, cómo se genera y por qué se usa?
* **Concepto:** Valor aleatorio único generado por cada usuario (CSPRNG) que se concatena con la contraseña antes de hashear. Evita que dos usuarios con la misma clave tengan el mismo hash y neutraliza tablas arcoíris precomputadas.

### 6. ¿Cómo almacena Django las contraseñas en Dulce Arte? (PBKDF2 y Argon2)
* **En nuestro proyecto:** Configuramos `PASSWORD_HASHERS` en [settings.py](../dulce_arte_project/settings.py) priorizando **`Argon2PasswordHasher`** (`argon2id`, resistente a GPU/ASIC por alto consumo de memoria + tiempo) y **`PBKDF2PasswordHasher`** como respaldo estándar.
* Cada registro en `auth_user` guarda `algoritmo$parametros$salt$hash` (nunca texto plano), verificable ejecutando `python manage.py verificar_seguridad` o consultando `/api/v1/auth/me/`.

---

## Bloque C: API Gateway y Protección de la API

### 1. HTTP API vs REST API en Amazon API Gateway: ¿cuál usaste y por qué?
* **HTTP API:** Más rápida, más económica (~70% menos costo) y pensada para proxy hacia backends modernos que ya validan **JWT** (como Django + SimpleJWT).
* **REST API:** Incluye características empresariales como *Usage Plans*, *API Keys*, caché de respuestas, WAF nativo y transformaciones VTL.
* **En Dulce Arte:** Se integra delante de la EC2 Backend para centralizar la exposición pública y aplicar **throttling/rate limit**, ya que la autenticación JWT y autorización RBAC se resuelven en DRF (`SimpleJWT` + [permissions.py](../gestion_pasteleria/permissions.py)).

### 2. ¿Cómo funciona el Rate Limiting / Throttling y cómo lo probaste?
* **Concepto:** Limita cuántas peticiones por segundo acepta la API usando el algoritmo **Token Bucket** (*rate* constante y *burst* de ráfaga). Al superarlo, API Gateway responde **HTTP `429 Too Many Requests`** protegiendo a la EC2 Backend y RDS contra saturación.
* **En Dulce Arte:** Se configuró throttling de prueba (ej. `2 req/s`, `burst 5`) y se comprobó lanzando ráfagas contra `/api/v1/health/` desde el módulo **JWT & Rate Limit** del frontend React y con `curl`.

### 3. Diferencia entre Autenticación, Autorización, Rate Limiting y Protección DDoS
* **Autenticación (AuthN):** Verifica *quién eres* (en Dulce Arte: `POST /api/v1/auth/token/` valida usuario/hash Argon2 y emite un JWT).
* **Autorización (AuthZ):** Verifica *qué puedes hacer* (en Dulce Arte: `RoleBasedAPIPermission` en [permissions.py](../gestion_pasteleria/permissions.py) valida el rol `ADMIN`, `VENTAS`, `COCINA`, `BODEGA`, `REPARTIDOR` devolviendo `403 Forbidden` si no corresponde).
* **Rate Limiting:** Controla la *tasa de solicitudes* permitidas por segundo para evitar abuso o agotamiento de recursos (`429`).
* **Protección DDoS:** Mitiga ataques distribuidos masivos a nivel de red/transporte y aplicación (en AWS: **AWS Shield** protege capas L3/L4 automáticamente; **AWS WAF** filtra tráfico malicioso L7 como SQLi/XSS y reglas por IP sobre API Gateway/CloudFront).

---

## Bloque D: AWS, Cifrado, Monitoreo y Respaldos

### 1. Seguridad de Amazon RDS PostgreSQL en Dulce Arte
* **Aislamiento:** La base de datos corre en **Amazon RDS**, separada físicamente de la EC2 Backend.
* **Red:** El Security Group de RDS solo abre el puerto `5432` al Security Group de la EC2 Backend.
* **Cifrado en reposo:** Activado al crear la instancia RDS (AES-256 vía KMS); no puede activarse con un simple switch después sin migrar vía snapshot cifrado.
* **Cifrado en tránsito (TLS):** Soportado en [settings.py](../dulce_arte_project/settings.py) mediante `DB_SSLMODE=require`.
* **Credenciales:** Guardadas fuera del código en `.env` con permisos `600`, nunca en el repositorio Git.

### 2. Seguridad de Amazon S3 en Dulce Arte
* **Uso:** Almacena estáticos y multimedia (`static/` y `media/`) mediante `django-storages` + `boto3` cuando `USE_S3=True`.
* **Cifrado en reposo:** SSE-S3 o SSE-KMS en el bucket.
* **Control de acceso:** *Block Public Access* activado, permisos vía rol IAM / política de bucket, y distribución controlada mediante **URLs prefirmadas** (`querystring_auth=True`, firma SigV4 temporal).
* **Cifrado vs Control de acceso vs Versionado:** El **cifrado** protege los bytes en disco; el **control de acceso** (IAM/Bucket Policy/Block Public Access) decide quién puede leer o escribir; el **versionado** conserva copias históricas contra borrados o sobrescrituras accidentales.

### 3. Monitoreo con CloudWatch: Métricas vs Logs vs Alarmas
* **Métricas:** Valores numéricos en series temporales (ej. `CPUUtilization`, `NetworkIn` de la EC2 Backend).
* **Logs:** Registros detallados de eventos de aplicación o sistema (ej. logs de Gunicorn/Nginx/Django).
* **Alarmas:** Reglas que evalúan una métrica contra un umbral (ej. `CPUUtilization > 70%`) y disparan acciones como notificar vía **Amazon SNS**.

### 4. Respaldos RDS: Automático vs Snapshot Manual y Respaldo cada 7 horas
* **Respaldo automático:** Gestionado por RDS dentro de una ventana diaria + logs de transacciones que permiten **Point-in-Time Recovery (PITR)** hasta cualquier segundo dentro del periodo de retención; se eliminan al borrar la instancia.
* **Snapshot manual:** Copia completa iniciada por el usuario (como `dulce-arte-snap-inicial`) que **persiste incluso si eliminas la instancia RDS**.
* **¿Cómo programar respaldos cada 7 horas?** RDS nativo solo permite respaldos automáticos diarios en una ventana horaria fija, no cada 7 horas. Para esa periodicidad se usa **Amazon EventBridge Scheduler** (`rate(7 hours)`) disparando una función **AWS Lambda** (implementada de referencia en [deploy/lambda_rds_backup_7h.py](../deploy/lambda_rds_backup_7h.py)) que llama a `rds.create_db_snapshot(...)` y notifica por **SNS**.
