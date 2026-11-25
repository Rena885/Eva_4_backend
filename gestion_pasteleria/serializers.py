"""
Serializadores de Django REST Framework (DRF) para el sistema Dulce Arte.
Incluye:
- CustomTokenObtainPairSerializer (JWT con claims de rol y nombre completo)
- Validaciones explícitas de dominio para operaciones CRUD
- Campos calculados de BOM, Kanban y Despacho Logístico
"""

from decimal import Decimal
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import (
    PerfilUsuario,
    Cliente,
    CategoriaInsumo,
    Insumo,
    ProductoPasteleria,
    ItemBOM,
    PedidoPersonalizado,
    InsumoExtraPedido,
    MovimientoInventario,
    HistorialKanban,
    RutaDespacho,
    DespachoPedido,
)
from .permissions import obtener_rol_api


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Emite JWT (access + refresh) inyectando el rol operativo y datos básicos en los claims."""

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['username'] = user.username
        token['rol'] = obtener_rol_api(user)
        token['nombre_completo'] = user.get_full_name() or user.username
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        rol = obtener_rol_api(self.user)
        roles_dict = dict(PerfilUsuario.ROL_CHOICES)
        data['usuario'] = {
            'id': self.user.id,
            'username': self.user.username,
            'nombre_completo': self.user.get_full_name() or self.user.username,
            'email': self.user.email,
            'rol': rol,
            'rol_display': roles_dict.get(rol, rol),
        }
        return data


class PerfilUsuarioSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='usuario.username', read_only=True)
    nombre_completo = serializers.SerializerMethodField()
    rol_display = serializers.CharField(source='get_rol_display', read_only=True)

    class Meta:
        model = PerfilUsuario
        fields = [
            'id',
            'username',
            'nombre_completo',
            'rol',
            'rol_display',
            'rut',
            'telefono',
            'turno',
            'especialidad_pastelera',
            'activo',
        ]

    def get_nombre_completo(self, obj) -> str:
        return obj.usuario.get_full_name() or obj.usuario.username


class ClienteSerializer(serializers.ModelSerializer):
    tipo_cliente_display = serializers.CharField(source='get_tipo_cliente_display', read_only=True)

    class Meta:
        model = Cliente
        fields = '__all__'

    def validate_rut(self, value):
        limpio = (value or '').strip().upper()
        if len(limpio) < 7:
            raise serializers.ValidationError('Ingrese un RUT válido (mínimo 7 caracteres).')
        return limpio

    def validate_nombre_completo(self, value):
        limpio = (value or '').strip()
        if len(limpio) < 3:
            raise serializers.ValidationError('El nombre completo debe tener al menos 3 caracteres.')
        return limpio


class CategoriaInsumoSerializer(serializers.ModelSerializer):
    class Meta:
        model = CategoriaInsumo
        fields = '__all__'


class InsumoSerializer(serializers.ModelSerializer):
    categoria_nombre = serializers.CharField(source='categoria.nombre', read_only=True)
    en_alerta_stock = serializers.BooleanField(read_only=True)
    alerta_vencimiento = serializers.CharField(read_only=True)
    dias_para_vencer = serializers.IntegerField(read_only=True)
    valor_inventario_total = serializers.DecimalField(max_digits=14, decimal_places=0, read_only=True)

    class Meta:
        model = Insumo
        fields = '__all__'

    def validate_stock_actual(self, value):
        if value < Decimal('0'):
            raise serializers.ValidationError('El stock disponible no puede ser negativo.')
        return value

    def validate_costo_unitario(self, value):
        if value < Decimal('0'):
            raise serializers.ValidationError('El costo unitario no puede ser negativo.')
        return value


class ItemBOMSerializer(serializers.ModelSerializer):
    insumo_nombre = serializers.CharField(source='insumo.nombre', read_only=True)
    insumo_sku = serializers.CharField(source='insumo.codigo_sku', read_only=True)
    unidad_medida = serializers.CharField(source='insumo.unidad_medida', read_only=True)
    etapa_uso_display = serializers.CharField(source='get_etapa_uso_display', read_only=True)
    cantidad_con_merma = serializers.DecimalField(max_digits=10, decimal_places=3, read_only=True)
    costo_linea = serializers.DecimalField(max_digits=12, decimal_places=0, read_only=True)

    class Meta:
        model = ItemBOM
        fields = '__all__'


class ProductoPasteleriaSerializer(serializers.ModelSerializer):
    categoria_display = serializers.CharField(source='get_categoria_producto_display', read_only=True)
    costo_bom_base = serializers.DecimalField(max_digits=12, decimal_places=0, read_only=True)
    margen_bruto_pct = serializers.DecimalField(max_digits=5, decimal_places=1, read_only=True)
    items_bom = ItemBOMSerializer(many=True, read_only=True)

    class Meta:
        model = ProductoPasteleria
        fields = '__all__'


class InsumoExtraPedidoSerializer(serializers.ModelSerializer):
    insumo_nombre = serializers.CharField(source='insumo.nombre', read_only=True)
    unidad_medida = serializers.CharField(source='insumo.unidad_medida', read_only=True)
    costo_extra = serializers.DecimalField(max_digits=12, decimal_places=0, read_only=True)

    class Meta:
        model = InsumoExtraPedido
        fields = '__all__'


class HistorialKanbanSerializer(serializers.ModelSerializer):
    usuario_nombre = serializers.SerializerMethodField()

    class Meta:
        model = HistorialKanban
        fields = '__all__'

    def get_usuario_nombre(self, obj) -> str:
        if not obj.usuario:
            return 'Sistema'
        return obj.usuario.get_full_name() or obj.usuario.username


class PedidoPersonalizadoSerializer(serializers.ModelSerializer):
    cliente_nombre = serializers.CharField(source='cliente.nombre_completo', read_only=True)
    cliente_rut = serializers.CharField(source='cliente.rut', read_only=True)
    producto_nombre = serializers.CharField(source='producto_base.nombre', read_only=True)
    estado_kanban_display = serializers.CharField(source='get_estado_kanban_display', read_only=True)
    estado_comercial_display = serializers.CharField(source='get_estado_comercial_display', read_only=True)
    factor_escala_porciones = serializers.DecimalField(max_digits=8, decimal_places=3, read_only=True)
    porcentaje_avance_kanban = serializers.IntegerField(read_only=True)
    saldo_pendiente = serializers.DecimalField(max_digits=12, decimal_places=0, read_only=True)
    en_riesgo_atraso = serializers.BooleanField(read_only=True)
    insumos_extra = InsumoExtraPedidoSerializer(many=True, read_only=True)
    historial_kanban = HistorialKanbanSerializer(many=True, read_only=True)

    class Meta:
        model = PedidoPersonalizado
        fields = '__all__'
        read_only_fields = ['codigo_pedido', 'fecha_creacion', 'fecha_descuento_bom', 'actualizado_en']

    def validate_porciones_solicitadas(self, value):
        if value < 1:
            raise serializers.ValidationError('Las porciones solicitadas deben ser al menos 1.')
        return value


class MovimientoInventarioSerializer(serializers.ModelSerializer):
    insumo_nombre = serializers.CharField(source='insumo.nombre', read_only=True)
    insumo_sku = serializers.CharField(source='insumo.codigo_sku', read_only=True)
    unidad_medida = serializers.CharField(source='insumo.unidad_medida', read_only=True)
    tipo_movimiento_display = serializers.CharField(source='get_tipo_movimiento_display', read_only=True)
    pedido_codigo = serializers.CharField(source='pedido_asociado.codigo_pedido', read_only=True)

    class Meta:
        model = MovimientoInventario
        fields = '__all__'


class DespachoPedidoSerializer(serializers.ModelSerializer):
    pedido_codigo = serializers.CharField(source='pedido.codigo_pedido', read_only=True)
    cliente_nombre = serializers.CharField(source='pedido.cliente.nombre_completo', read_only=True)
    producto_nombre = serializers.CharField(source='pedido.producto_base.nombre', read_only=True)
    estado_entrega_display = serializers.CharField(source='get_estado_entrega_display', read_only=True)
    tiene_respaldo_digital = serializers.BooleanField(read_only=True)

    class Meta:
        model = DespachoPedido
        fields = '__all__'


class RutaDespachoSerializer(serializers.ModelSerializer):
    repartidor_nombre = serializers.SerializerMethodField()
    estado_ruta_display = serializers.CharField(source='get_estado_ruta_display', read_only=True)
    total_paradas = serializers.IntegerField(read_only=True)
    paradas_entregadas = serializers.IntegerField(read_only=True)
    porcentaje_completado = serializers.IntegerField(read_only=True)
    entregas = DespachoPedidoSerializer(many=True, read_only=True)

    class Meta:
        model = RutaDespacho
        fields = '__all__'

    def get_repartidor_nombre(self, obj) -> str:
        return obj.repartidor.get_full_name() or obj.repartidor.username
