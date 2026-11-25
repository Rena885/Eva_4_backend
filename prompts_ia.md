# Registro de Consultas y Apoyo de Inteligencia Artificial (`prompts_ia.md`)

**Asignatura:** Programación Backend — Evaluación N.º 3 y N.º 4  
**Docente:** Marcelo Alvarado Aravena  
**Proyecto:** Sistema de Trazabilidad y Gestión de Pedidos para Pastelería Artesanal (**Dulce Arte**)  
**Arquitectura:** Arquitectura Distribuida AWS (EC2 Frontend React + API Gateway + EC2 Backend DRF + RDS PostgreSQL + S3 + CloudWatch)

---

## 1. Propósito del Registro

En cumplimiento de la **Evaluación N.º 4** (*"La IA podrá utilizarse para generar recomendaciones de seguridad, pero el estudiante deberá documentar al menos dos recomendaciones, contrastarlas con documentación oficial y justificar su aplicación o descarte"*), se documentan las recomendaciones técnicas evaluadas y aplicadas sobre el proyecto base de la Evaluación 3.

---

## 2. Recomendaciones de Seguridad y Arquitectura (EVA 4 — Contrastadas con Documentación Oficial)

### Recomendación IA 1: Autenticación Stateless con JWT (`SimpleJWT`) y Autorización RBAC por recurso
> **Consulta realizada a la IA:**  
> *"Al separar el frontend (React en EC2 Frontend) del backend (Django REST Framework en EC2 Backend) detrás de Amazon API Gateway, ¿qué esquema de autenticación y autorización debo usar en DRF en lugar de depender solo de cookies de sesión?"*

* **Recomendación obtenida:** Sustituir el flujo exclusivo por sesión/cookie en la API por **`djangorestframework-simplejwt`** (`JWTAuthentication`) con tokens de acceso de vida corta y *refresh tokens*, inyectando el rol del usuario como *custom claim* y validando permisos RBAC por ViewSet y `@action`, además de configurar `django-cors-headers` con orígenes explícitos.
* **Contraste con documentación oficial:**
  * Documentación de **Django REST Framework** (*Authentication*): indica que `SessionAuthentication` depende de cookies y protección CSRF del mismo dominio, mientras `JWTAuthentication` permite clientes SPA desacoplados en distintos dominios/IPs enviando `Authorization: Bearer <token>`.
  * Documentación de **SimpleJWT** y **OWASP REST Security Cheat Sheet**: recomiendan tiempos de expiración acotados para el *access token* (ej. 60 min), rotación de *refresh token* y no confiar únicamente en la autenticación: cada endpoint debe verificar autorización por rol/recurso (*Broken Object/Function Level Authorization*).
* **Decisión (Aplicada en el proyecto):**
  * Se implementó `SimpleJWT` + `CustomTokenObtainPairSerializer` en [`gestion_pasteleria/serializers.py`](gestion_pasteleria/serializers.py) y [`gestion_pasteleria/api_urls.py`](gestion_pasteleria/api_urls.py).
  * Se creó [`gestion_pasteleria/permissions.py`](gestion_pasteleria/permissions.py) (`RoleBasedAPIPermission` y permisos específicos por acción para `VENTAS`, `COCINA`, `BODEGA` y `REPARTIDOR`).
  * Se mantuvo `SessionAuthentication` como respaldo en [`dulce_arte_project/settings.py`](dulce_arte_project/settings.py) únicamente para no romper las vistas SSR y Swagger UI locales, priorizando `JWTAuthentication` como primer autenticador para que las peticiones sin token retornen `HTTP 401 Unauthorized`.

---

### Recomendación IA 2: Fortalecimiento de Hashing de Contraseñas con `Argon2` y Eliminación de Secretos Hardcodeados
> **Consulta realizada a la IA:**  
> *"¿Cómo reforzar el almacenamiento de contraseñas en Django y preparar `settings.py` para superar análisis SAST (SonarQube) y DAST (OWASP ZAP) antes de subir a AWS?"*

* **Recomendación obtenida:**
  1. Configurar `Argon2PasswordHasher` (`argon2-cffi`) como hasher principal en `PASSWORD_HASHERS` por delante de `PBKDF2PasswordHasher`.
  2. Eliminar valores hardcodeados de `SECRET_KEY` y contraseñas de BD en `settings.py`, poner `DEBUG = False` por defecto y habilitar cabeceras de seguridad (`X_FRAME_OPTIONS = 'DENY'`, `SECURE_CONTENT_TYPE_NOSNIFF = True`, `REFERRER_POLICY = 'same-origin'`, `SESSION_COOKIE_HTTPONLY = True`).
* **Contraste con documentación oficial:**
  * Documentación oficial de **Django** (*Password management in Django*): confirma que **Argon2** es el ganador del *Password Hashing Competition* y el algoritmo recomendado por Django cuando se instala `argon2-cffi`, manteniendo `PBKDF2PasswordHasher` en la lista para verificar hashes antiguos y actualizarlos transparentemente.
  * **OWASP Password Storage Cheat Sheet**: recomienda Argon2id como primera opción frente a ataques por GPU/ASIC gracias a su costo configurable en memoria, siempre acompañado de *salt* aleatorio único (gestionado automáticamente por Django).
* **Decisión (Aplicada y parcial/condicional):**
  * **Aplicada:** `PASSWORD_HASHERS` actualizado en [`dulce_arte_project/settings.py`](dulce_arte_project/settings.py), validado con [`gestion_pasteleria/management/commands/verificar_seguridad.py`](gestion_pasteleria/management/commands/verificar_seguridad.py) y pruebas unitarias en [`gestion_pasteleria/tests.py`](gestion_pasteleria/tests.py).
  * **Condicional (`USE_HTTPS`):** Se descartó forzar `SECURE_SSL_REDIRECT = True` de manera incondicional porque en laboratorios AWS Academy las instancias EC2 operan en HTTP puerto 80 detrás de API Gateway; dejarlo fijo provocaría bucles de redirección infinita. En su lugar se parametrizó mediante la variable `USE_HTTPS`.

---

### Recomendación IA 3: Cifrado en Reposo/Tránsito en Amazon RDS y Acceso Controlado a S3 con URLs Prefirmadas
> **Consulta realizada a la IA:**  
> *"¿Cómo conectar Django de forma segura a Amazon RDS PostgreSQL y servir archivos desde Amazon S3 sin abrir públicamente todo el bucket?"*

* **Recomendación obtenida:** Crear la instancia RDS con cifrado en reposo habilitado desde el inicio, restringir el Security Group del puerto `5432` exclusivamente al Security Group de la EC2 Backend, habilitar SSL/TLS (`sslmode=require`) desde Django y usar `django-storages` (`S3Storage`) con *Block Public Access* activado y `querystring_auth=True` (URLs prefirmadas SigV4).
* **Contraste con documentación oficial:**
  * **AWS RDS User Guide**: confirma que no se puede activar el cifrado en una instancia RDS existente sin crear un snapshot y copiarlo cifrado; asimismo documenta la conexión TLS mediante `sslmode=require`.
  * **AWS S3 Best Practices**: recomienda mantener *Block Public Access* habilitado y emplear roles IAM + URLs prefirmadas temporales (SigV4) para controlar el acceso sin exponer el bucket completo.
* **Decisión (Aplicada):** Se integró `DB_SSLMODE` y `USE_S3` / `AWS_S3_STATIC_QUERYSTRING_AUTH` en [`dulce_arte_project/settings.py`](dulce_arte_project/settings.py) y en [`deploy/deploy_backend_ec2.sh`](deploy/deploy_backend_ec2.sh).

---

## 3. Bitácora Previa de la Evaluación 3 (Base del Dominio Dulce Arte)

1. **Modelado Relacional (12 entidades) y Paradigma 4+1:** Estructurado en [`gestion_pasteleria/models.py`](gestion_pasteleria/models.py) conectando clientes, recetas base BOM, insumos, pedidos personalizados, Kanban de cocina y rutas de despacho.
2. **Transacciones Atómicas BOM:** Descuento automático de insumos con `@transaction.atomic` y `select_for_update()` al pasar a `EN_PREPARACION` en el tablero Kanban.
3. **API RESTful DRF y Simulador en Vivo:** ViewSets CRUD y acciones personalizadas (`simular_cotizacion`, `mover_kanban`, `explosion_bom`, `confirmar_entrega`).
4. **Firma Digital HTML5 Canvas:** Captura de firma en Base64 para confirmación de entregas en ruta.
