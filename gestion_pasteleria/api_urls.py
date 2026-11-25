"""
Rutas de la API REST (DRF Router + JWT + OpenAPI + Healthcheck) bajo el prefijo /api/v1/.
"""
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerSplitView
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .api_views import (
    CategoriaInsumoViewSet,
    ClienteViewSet,
    CustomTokenObtainPairView,
    DespachoPedidoViewSet,
    InsumoExtraPedidoViewSet,
    InsumoViewSet,
    ItemBOMViewSet,
    MovimientoInventarioViewSet,
    PedidoPersonalizadoViewSet,
    ProductoPasteleriaViewSet,
    RutaDespachoViewSet,
    auth_me,
    dashboard_resumen,
    health_check,
)

router = DefaultRouter()
router.register(r'clientes', ClienteViewSet, basename='api-clientes')
router.register(r'categorias-insumo', CategoriaInsumoViewSet, basename='api-categorias-insumo')
router.register(r'insumos', InsumoViewSet, basename='api-insumos')
router.register(r'productos', ProductoPasteleriaViewSet, basename='api-productos')
router.register(r'items-bom', ItemBOMViewSet, basename='api-items-bom')
router.register(r'pedidos', PedidoPersonalizadoViewSet, basename='api-pedidos')
router.register(r'insumos-extra', InsumoExtraPedidoViewSet, basename='api-insumos-extra')
router.register(r'movimientos-inventario', MovimientoInventarioViewSet, basename='api-movimientos-inventario')
router.register(r'rutas-despacho', RutaDespachoViewSet, basename='api-rutas-despacho')
router.register(r'despachos', DespachoPedidoViewSet, basename='api-despachos')

urlpatterns = [
    # Autenticación JWT y Perfil
    path('auth/token/', CustomTokenObtainPairView.as_view(), name='api-token-obtain'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='api-token-refresh'),
    path('auth/me/', auth_me, name='api-auth-me'),

    # Monitoreo y Dashboard JSON
    path('health/', health_check, name='api-health'),
    path('dashboard/resumen/', dashboard_resumen, name='api-dashboard-resumen'),

    # Documentación OpenAPI / Swagger UI
    path('schema/', SpectacularAPIView.as_view(), name='api-schema'),
    path('docs/', SpectacularSwaggerSplitView.as_view(url_name='api-schema'), name='api-swagger-ui'),

    # Endpoints CRUD del dominio
    path('', include(router.urls)),
]
