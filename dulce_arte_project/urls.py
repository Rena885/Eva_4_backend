"""
Definición principal de URLs para Dulce Arte.
"""
from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.http import Http404, HttpResponse
from django.views.decorators.http import require_GET
from gestion_pasteleria.views import error_404_view

_OPENAPI_ASSETS_ROOT = settings.BASE_DIR / 'static' / 'openapi'
_OPENAPI_ALLOWED_ASSETS = {
    'openapi-docs.css': ('openapi-docs.css', 'text/css; charset=utf-8'),
    'openapi-docs.js': ('openapi-docs.js', 'application/javascript; charset=utf-8'),
}


@require_GET
def swagger_asset_view(request, asset_name):
    """Sirve assets locales sin dependencias de terceros para la consola OpenAPI."""
    asset_meta = _OPENAPI_ALLOWED_ASSETS.get(asset_name)
    if not asset_meta:
        raise Http404('Recurso OpenAPI no permitido.')
    safe_filename, content_type = asset_meta
    asset_path = _OPENAPI_ASSETS_ROOT / safe_filename
    if not asset_path.is_file():
        raise Http404('Recurso OpenAPI no encontrado.')
    resp = HttpResponse(asset_path.read_bytes(), content_type=content_type)
    resp['Cache-Control'] = 'public, max-age=86400'
    return resp


@require_GET
def robots_txt_view(request):
    return HttpResponse('User-agent: *\nAllow: /api/v1/docs/\n', content_type='text/plain; charset=utf-8')


@require_GET
def sitemap_xml_view(request):
    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        '  <url><loc>/api/v1/docs/</loc></url>\n'
        '</urlset>\n'
    )
    return HttpResponse(xml, content_type='application/xml; charset=utf-8')


urlpatterns = [
    path('robots.txt', robots_txt_view, name='robots-txt'),
    path('sitemap.xml', sitemap_xml_view, name='sitemap-xml'),
    path('swagger-assets/<path:asset_name>', swagger_asset_view, name='swagger-asset'),
    path('admin/', admin.site.urls),
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
