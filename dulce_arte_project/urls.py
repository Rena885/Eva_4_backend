"""
Definición principal de URLs para Dulce Arte.
"""
from pathlib import Path
from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.http import Http404, HttpResponse
from django.views.decorators.http import require_GET
import drf_spectacular_sidecar
from gestion_pasteleria.views import error_404_view

_SWAGGER_ASSETS_ROOT = Path(drf_spectacular_sidecar.__file__).resolve().parent / 'static' / 'drf_spectacular_sidecar' / 'swagger-ui-dist'
_SWAGGER_ALLOWED_ASSETS = {
    'swagger-ui-dist/swagger-ui.css': ('swagger-ui.css', 'text/css; charset=utf-8'),
    'swagger-ui-dist/swagger-ui-bundle.js': ('swagger-ui-bundle.js', 'application/javascript; charset=utf-8'),
    'swagger-ui-dist/swagger-ui-standalone-preset.js': ('swagger-ui-standalone-preset.js', 'application/javascript; charset=utf-8'),
    'swagger-ui-dist/favicon-32x32.png': ('favicon-32x32.png', 'image/png'),
}


@require_GET
def swagger_asset_view(request, asset_name):
    """Sirve assets estáticos de Swagger UI desde el mismo origen (mitiga alertas SRI/Cross-Domain)."""
    asset_meta = _SWAGGER_ALLOWED_ASSETS.get(asset_name)
    if not asset_meta:
        raise Http404('Recurso Swagger no permitido.')
    safe_filename, content_type = asset_meta
    asset_path = _SWAGGER_ASSETS_ROOT / safe_filename
    if not asset_path.is_file():
        raise Http404('Recurso Swagger no encontrado.')
    resp = HttpResponse(asset_path.read_bytes(), content_type=content_type)
    resp['Cache-Control'] = 'public, max-age=86400'
    return resp


urlpatterns = [
    path('admin/', admin.site.urls),
    path('swagger-assets/<path:asset_name>', swagger_asset_view, name='swagger-asset'),
    path('api/v1/', include('gestion_pasteleria.api_urls')),
    path('api-auth/', include('rest_framework.urls', namespace='rest_framework')),
    path('', include('gestion_pasteleria.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

# Ruta comodín para capturar cualquier URL inexistente tanto en modo DEBUG como en Producción
urlpatterns += [
    re_path(r'^.*$', error_404_view),
]

# Manejador global para excepciones Http404 lanzadas desde las vistas
handler404 = 'gestion_pasteleria.views.error_404_view'


