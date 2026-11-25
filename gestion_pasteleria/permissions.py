"""
Permisos basados en roles (RBAC) para los recursos de la API RESTful de Dulce Arte.
Complementa la autenticación JWT verificando que cada usuario solo modifique los
recursos autorizados para su rol operativo.
"""

from rest_framework import permissions


def obtener_rol_api(user) -> str:
    """Obtiene el rol operativo del usuario autenticado para decisiones RBAC."""
    if not user or not user.is_authenticated:
        return 'ANONIMO'
    if user.is_superuser:
        return 'ADMIN'
    if hasattr(user, 'perfil'):
        return user.perfil.rol
    return 'VENTAS'


class RoleBasedAPIPermission(permissions.BasePermission):
    """
    Permiso reutilizable por rol:
    - Lectura (GET/HEAD/OPTIONS): permitida a roles en `read_roles` (por defecto todos autenticados).
    - Escritura (POST/PUT/PATCH/DELETE): permitida solo a `ADMIN` o roles en `write_roles`.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        rol = obtener_rol_api(request.user)
        if rol == 'ADMIN':
            return True

        if request.method in permissions.SAFE_METHODS:
            read_roles = getattr(view, 'read_roles', None)
            if read_roles is None:
                return True
            return rol in read_roles

        write_roles = getattr(view, 'write_roles', ())
        return rol in write_roles


def crear_permiso_por_roles(*roles_autorizados, mensaje='No tiene permisos para ejecutar esta acción.'):
    """Genera una clase de permiso DRF para acciones @action específicas según rol."""

    class _ActionRolePermission(permissions.BasePermission):
        def has_permission(self, request, view):
            if not request.user or not request.user.is_authenticated:
                return False
            rol = obtener_rol_api(request.user)
            return rol == 'ADMIN' or rol in roles_autorizados

    _ActionRolePermission.message = mensaje
    return _ActionRolePermission


PuedeGestionarCocina = crear_permiso_por_roles(
    'COCINA',
    mensaje='Solo Cocina (Maestro Pastelero) o Administrador pueden ejecutar esta acción en el taller.',
)
PuedeGestionarBodega = crear_permiso_por_roles(
    'BODEGA',
    mensaje='Solo Encargado de Bodega o Administrador pueden modificar stock de insumos.',
)
PuedeGestionarDespacho = crear_permiso_por_roles(
    'REPARTIDOR',
    mensaje='Solo Repartidor o Administrador pueden confirmar entregas en ruta.',
)
PuedeCotizarPedidos = crear_permiso_por_roles(
    'VENTAS',
    mensaje='Solo Ventas o Administrador pueden cotizar y crear pedidos.',
)
