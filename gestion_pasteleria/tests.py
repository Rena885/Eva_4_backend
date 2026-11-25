"""
Suite de Pruebas Automatizadas (Unitarias y de Integración API DRF)
para verificar las 4 funcionalidades clave de Dulce Arte.
"""

from decimal import Decimal
from datetime import timedelta
from django.test import TestCase
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.utils import timezone
from rest_framework.test import APIClient

from .models import (
    PerfilUsuario,
    Cliente,
    CategoriaInsumo,
    Insumo,
    ProductoPasteleria,
    ItemBOM,
    PedidoPersonalizado,
    MovimientoInventario,
    RutaDespacho,
    DespachoPedido,
)


class DulceArteBusinessLogicTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='chef_test', password='password123')
        self.cliente = Cliente.objects.create(
            rut='12.345.678-9',
            nombre_completo='Cliente Prueba',
            email='cliente@test.cl',
            telefono='+56911112222',
            direccion_habitual='Av. Providencia 1234',
            comuna='Providencia',
        )
        self.cat = CategoriaInsumo.objects.create(nombre='Chocolatería')
        self.insumo_choco = Insumo.objects.create(
            codigo_sku='SKU-CHOCO-1',
            nombre='Chocolate Belga 70%',
            categoria=self.cat,
            unidad_medida='KG',
            stock_actual=Decimal('10.000'),
            stock_minimo=Decimal('2.000'),
            costo_unitario=Decimal('15000'),
        )
        self.producto = ProductoPasteleria.objects.create(
            codigo='PROD-001',
            nombre='Torta Belga',
            porciones_base=15,
            precio_base=Decimal('45000'),
            descripcion='Receta de prueba',
        )
        # Requiere 1.000 kg neto + 0% merma para 15 porciones
        ItemBOM.objects.create(
            producto=self.producto,
            insumo=self.insumo_choco,
            cantidad_requerida=Decimal('1.000'),
            merma_tecnica_pct=Decimal('0.00'),
            etapa_uso='RELLENO',
        )

    def test_cotizacion_y_descuento_automatico_bom_en_kanban(self):
        """
        Verifica Funcionalidad 1, 2 y 3:
        Un pedido de 30 porciones (factor 2.0x sobre base 15) debe descontar
        exactamente 2.000 KG de Chocolate Belga al pasar a EN_PREPARACION en el Kanban.
        """
        pedido = PedidoPersonalizado.objects.create(
            cliente=self.cliente,
            producto_base=self.producto,
            porciones_solicitadas=30,
            nivel_complejidad='ESTANDAR',
            descripcion_diseno='Diseño clásico',
            fecha_entrega_comprometida=timezone.now() + timedelta(days=2),
        )
        self.assertEqual(pedido.factor_escala_porciones, Decimal('2.000'))
        self.assertFalse(pedido.insumos_descontados)

        # Mover en Kanban a EN_PREPARACION dispara el descuento automático BOM
        pedido.cambiar_estado_kanban('EN_PREPARACION', usuario=self.user)
        self.insumo_choco.refresh_from_db()

        self.assertTrue(pedido.insumos_descontados)
        self.assertEqual(self.insumo_choco.stock_actual, Decimal('8.000'))
        self.assertEqual(
            MovimientoInventario.objects.filter(pedido_asociado=pedido, tipo_movimiento='SALIDA_BOM_PEDIDO').count(),
            1,
        )

    def test_bloqueo_kanban_por_stock_insuficiente_bom(self):
        """Verifica que el sistema impida iniciar preparación si falta stock en bodega."""
        self.insumo_choco.stock_actual = Decimal('0.500')
        self.insumo_choco.save()

        pedido = PedidoPersonalizado.objects.create(
            cliente=self.cliente,
            producto_base=self.producto,
            porciones_solicitadas=15,
            descripcion_diseno='Diseño prueba',
            fecha_entrega_comprometida=timezone.now() + timedelta(days=1),
        )
        with self.assertRaises(ValidationError):
            pedido.cambiar_estado_kanban('EN_PREPARACION', usuario=self.user)

    def test_confirmacion_despacho_con_firma_digital(self):
        """Verifica Funcionalidad 4: Confirmación de entrega en ruta con Firma Digital Base64."""
        pedido = PedidoPersonalizado.objects.create(
            cliente=self.cliente,
            producto_base=self.producto,
            porciones_solicitadas=15,
            descripcion_diseno='Diseño entrega',
            fecha_entrega_comprometida=timezone.now() + timedelta(hours=5),
        )
        ruta = RutaDespacho.objects.create(
            codigo_ruta='RUTA-TEST-01',
            nombre_ruta='Ruta Test',
            repartidor=self.user,
        )
        despacho = DespachoPedido.objects.create(
            ruta=ruta,
            pedido=pedido,
            orden_parada=1,
            direccion_destino='Av. Providencia 1234',
            comuna_destino='Providencia',
            telefono_contacto='+56911112222',
        )

        # Sin firma ni foto debe lanzar ValidationError
        with self.assertRaises(ValidationError):
            despacho.confirmar_entrega_digital(
                nombre_receptor='Cliente Prueba',
                rut_receptor='12.345.678-9',
                firma_base64='',
            )

        # Con firma digital Base64 válida confirma entrega y completa la ruta
        despacho.confirmar_entrega_digital(
            nombre_receptor='Cliente Prueba',
            rut_receptor='12.345.678-9',
            firma_base64='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            usuario=self.user,
        )
        pedido.refresh_from_db()
        ruta.refresh_from_db()
        self.assertEqual(despacho.estado_entrega, 'ENTREGADO')
        self.assertEqual(pedido.estado_comercial, 'ENTREGADO')
        self.assertEqual(ruta.estado_ruta, 'COMPLETADA')

    def test_api_drf_simulador_cotizacion(self):
        """Verifica el endpoint DRF POST /api/v1/pedidos/simular_cotizacion/."""
        client = APIClient()
        client.force_authenticate(user=self.user)
        response = client.post(
            '/api/v1/pedidos/simular_cotizacion/',
            {
                'producto_base_id': self.producto.id,
                'porciones_solicitadas': 30,
                'nivel_complejidad': 'PERSONALIZADO_MEDIO',
                'modalidad_entrega': 'DESPACHO_DOMICILIO',
            },
            format='json',
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['stock_factible'])
        self.assertEqual(response.data['porciones_solicitadas'], 30)

    def test_vistas_web_y_admin_renderizan_correctamente(self):
        """Verifica que todas las vistas HTML, el Admin personalizado y la API respondan HTTP 200."""
        self.user.is_staff = True
        self.user.is_superuser = True
        self.user.save()
        self.client.force_login(self.user)

        pedido = PedidoPersonalizado.objects.create(
            cliente=self.cliente,
            producto_base=self.producto,
            porciones_solicitadas=15,
            descripcion_diseno='Diseño integral',
            fecha_entrega_comprometida=timezone.now() + timedelta(days=1),
        )
        ruta = RutaDespacho.objects.create(
            codigo_ruta='RUTA-VIEW-01',
            nombre_ruta='Ruta Vistas',
            repartidor=self.user,
        )
        despacho = DespachoPedido.objects.create(
            ruta=ruta,
            pedido=pedido,
            orden_parada=1,
            direccion_destino='Av. Providencia 1234',
            comuna_destino='Providencia',
            telefono_contacto='+56911112222',
        )

        rutas_a_probar = [
            '/',
            '/pedidos/',
            '/pedidos/nuevo/',
            f'/pedidos/{pedido.pk}/',
            f'/pedidos/{pedido.pk}/editar/',
            '/clientes/',
            '/cocina/kanban/',
            '/bodega/bom/',
            '/logistica/rutas/',
            f'/logistica/entregas/{despacho.pk}/confirmar/',
            '/administracion/',
            '/admin/',
            '/api/v1/pedidos/',
            '/api/v1/insumos/alertas_criticas/',
            f'/api/v1/pedidos/{pedido.pk}/explosion_bom/',
        ]
        for url in rutas_a_probar:
            resp = self.client.get(url)
            self.assertEqual(resp.status_code, 200, f"Fallo al cargar la ruta {url}")

    def test_restriccion_panel_administracion_por_rol(self):
        """
        Verifica Criterio 4 de la Rúbrica (Seguridad y Permisos por Rol):
        - El perfil BODEGA no debe visualizar la sección 'Administración' ni acceder a /administracion/.
        - El perfil COCINA (Chef) no debe acceder a Despachos ni Firmas de Entrega (/logistica/rutas/).
        - El perfil REPARTIDOR sí puede acceder a Despachos y Firmas de Entrega.
        - ADMIN tiene acceso global.
        """
        self.client.force_login(self.user)
        PerfilUsuario.objects.update_or_create(usuario=self.user, defaults={'rol': 'BODEGA'})

        resp_dashboard_bodega = self.client.get('/')
        self.assertEqual(resp_dashboard_bodega.status_code, 200)
        self.assertNotContains(resp_dashboard_bodega, '<span>Panel admin</span>')
        self.assertNotContains(resp_dashboard_bodega, '<span>Django Admin</span>')
        self.assertNotContains(resp_dashboard_bodega, 'id="selectorRol"')

        resp_admin_bodega = self.client.get('/administracion/')
        self.assertEqual(resp_admin_bodega.status_code, 302)

        # Chef (COCINA) no puede hacer entregas ni firmar despachos
        PerfilUsuario.objects.update_or_create(usuario=self.user, defaults={'rol': 'COCINA'})
        self.assertEqual(self.client.get('/logistica/rutas/').status_code, 302)

        # Repartidor (REPARTIDOR) sí puede gestionar despachos, pero no entrar a Cocina Kanban
        PerfilUsuario.objects.update_or_create(usuario=self.user, defaults={'rol': 'REPARTIDOR'})
        self.assertEqual(self.client.get('/logistica/rutas/').status_code, 200)
        self.assertEqual(self.client.get('/cocina/kanban/').status_code, 302)

        # Administrador General (ADMIN) tiene acceso completo
        PerfilUsuario.objects.update_or_create(usuario=self.user, defaults={'rol': 'ADMIN'})
        resp_dashboard_admin = self.client.get('/')
        self.assertContains(resp_dashboard_admin, '<span>Panel admin</span>')
        self.assertContains(resp_dashboard_admin, '<span>Django Admin</span>')
        self.assertEqual(self.client.get('/administracion/').status_code, 200)

    def test_flujo_completo_crear_insumos_receta_producto_y_vender(self):
        """
        Verifica el flujo End-to-End solicitado por el usuario:
        1. Agregar nuevos insumos (Queso, Pan, Jamón) sin exigir SKU ni categoría manual.
        2. Crear nueva receta y producto ('Pan con queso y jamón') vinculando Queso, Pan y Jamón.
        3. Vender ese producto (1 o más unidades) y descontar stock automáticamente en bodega.
        """
        self.client.force_login(self.user)
        PerfilUsuario.objects.update_or_create(usuario=self.user, defaults={'rol': 'ADMIN'})

        # 1. Crear insumos: Queso, Pan, Jamón
        for nombre_ins, costo in [('Queso', '500'), ('Pan', '400'), ('Jamón', '600')]:
            resp_ins = self.client.post(
                '/bodega/bom/',
                {
                    'accion': 'guardar_insumo',
                    'nombre': nombre_ins,
                    'unidad_medida': 'UNIDAD',
                    'stock_actual': '20,000',
                    'stock_minimo': '2',
                    'costo_unitario': costo,
                },
            )
            self.assertEqual(resp_ins.status_code, 302)

        ins_queso = Insumo.objects.get(nombre='Queso')
        ins_pan = Insumo.objects.get(nombre='Pan')
        ins_jamon = Insumo.objects.get(nombre='Jamón')
        self.assertEqual(ins_queso.stock_actual, Decimal('20.000'))
        self.assertTrue(ins_queso.codigo_sku.startswith('INS-QUE-'))

        # 2. Crear receta y producto 'Pan con queso y jamón' con sus 3 insumos en un solo paso
        resp_prod = self.client.post(
            '/bodega/bom/',
            {
                'accion': 'guardar_producto',
                'nombre': 'Pan con queso y jamón',
                'precio_base': '2500',
                'porciones_base': '1',
                'receta_insumo_id': [str(ins_pan.pk), str(ins_queso.pk), str(ins_jamon.pk)],
                'receta_cantidad': ['1', '2', '1'],
                'receta_etapa': ['BATIDO_MASA', 'RELLENO', 'RELLENO'],
                'receta_merma': ['0', '0', '0'],
            },
        )
        self.assertEqual(resp_prod.status_code, 302)

        prod_sandwich = ProductoPasteleria.objects.get(nombre='Pan con queso y jamón')
        self.assertEqual(prod_sandwich.items_bom.count(), 3)

        # 3. Vender 2 unidades de 'Pan con queso y jamón' mediante Venta Rápida
        resp_venta = self.client.post(
            '/bodega/bom/',
            {
                'accion': 'vender_producto_rapido',
                'producto_id': prod_sandwich.pk,
                'cantidad_venta': '2',
            },
        )
        self.assertEqual(resp_venta.status_code, 302)

        ins_pan.refresh_from_db()
        ins_queso.refresh_from_db()
        ins_jamon.refresh_from_db()

        # Se vendieron 2 unidades -> descuenta 2 de Pan, 4 de Queso, 2 de Jamón
        self.assertEqual(ins_pan.stock_actual, Decimal('18.000'))
        self.assertEqual(ins_queso.stock_actual, Decimal('16.000'))
        self.assertEqual(ins_jamon.stock_actual, Decimal('18.000'))


class Eva4SecurityAndAPITests(TestCase):
    """Pruebas de EVA 4: JWT, RBAC por rol, CRUD + validaciones, Argon2 + salt, Healthcheck y OpenAPI."""

    def setUp(self):
        self.password_raw = 'DulceArteSegura2026!'
        self.admin_user = User.objects.create_user(
            username='admin_eva4',
            password=self.password_raw,
            first_name='Admin',
            last_name='Eva4',
            is_superuser=True,
            is_staff=True,
        )
        PerfilUsuario.objects.create(usuario=self.admin_user, rol='ADMIN')

        self.ventas_user = User.objects.create_user(username='ventas_eva4', password=self.password_raw)
        PerfilUsuario.objects.create(usuario=self.ventas_user, rol='VENTAS')

        self.cocina_user = User.objects.create_user(username='cocina_eva4', password=self.password_raw)
        PerfilUsuario.objects.create(usuario=self.cocina_user, rol='COCINA')

        self.bodega_user = User.objects.create_user(username='bodega_eva4', password=self.password_raw)
        PerfilUsuario.objects.create(usuario=self.bodega_user, rol='BODEGA')

        self.repartidor_user = User.objects.create_user(username='repartidor_eva4', password=self.password_raw)
        PerfilUsuario.objects.create(usuario=self.repartidor_user, rol='REPARTIDOR')

        self.cat = CategoriaInsumo.objects.create(nombre='Lácteos Test')
        self.insumo = Insumo.objects.create(
            codigo_sku='INS-TEST-001',
            nombre='Crema Test',
            categoria=self.cat,
            unidad_medida='LT',
            stock_actual=Decimal('10.000'),
            stock_minimo=Decimal('2.000'),
            costo_unitario=Decimal('4000'),
        )
        self.producto = ProductoPasteleria.objects.create(
            codigo='REC-TEST-01',
            nombre='Torta Test JWT',
            porciones_base=10,
            precio_base=Decimal('35000'),
        )
        ItemBOM.objects.create(
            producto=self.producto,
            insumo=self.insumo,
            cantidad_requerida=Decimal('1.000'),
            merma_tecnica_pct=Decimal('0.00'),
            etapa_uso='RELLENO',
        )

    def _obtener_tokens(self, username):
        client = APIClient()
        resp = client.post(
            '/api/v1/auth/token/',
            {'username': username, 'password': self.password_raw},
            format='json',
        )
        self.assertEqual(resp.status_code, 200)
        return resp.data

    def test_jwt_login_refresh_y_proteccion_401(self):
        client = APIClient()
        # Sin token debe rechazar con 401
        self.assertEqual(client.get('/api/v1/clientes/').status_code, 401)
        self.assertEqual(client.get('/api/v1/dashboard/resumen/').status_code, 401)

        tokens = self._obtener_tokens('ventas_eva4')
        self.assertIn('access', tokens)
        self.assertIn('refresh', tokens)
        self.assertEqual(tokens['usuario']['rol'], 'VENTAS')

        client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
        me_resp = client.get('/api/v1/auth/me/')
        self.assertEqual(me_resp.status_code, 200)
        self.assertEqual(me_resp.data['rol'], 'VENTAS')
        self.assertEqual(me_resp.data['hasher_algoritmo'], 'argon2')
        self.assertFalse(me_resp.data['password_en_texto_plano'])

        refresh_resp = client.post(
            '/api/v1/auth/token/refresh/',
            {'refresh': tokens['refresh']},
            format='json',
        )
        self.assertEqual(refresh_resp.status_code, 200)
        self.assertIn('access', refresh_resp.data)

    def test_rbac_autorizacion_api_por_rol(self):
        # BODEGA no puede crear clientes ni mover Kanban, pero sí ajustar stock
        bodega_tokens = self._obtener_tokens('bodega_eva4')
        client_bodega = APIClient()
        client_bodega.credentials(HTTP_AUTHORIZATION=f"Bearer {bodega_tokens['access']}")

        resp_cli = client_bodega.post(
            '/api/v1/clientes/',
            {
                'rut': '18.111.222-3',
                'nombre_completo': 'Cliente Denegado',
                'email': 'denegado@test.cl',
                'telefono': '+56912345678',
                'direccion_habitual': 'Calle 1',
                'comuna': 'Providencia',
            },
            format='json',
        )
        self.assertEqual(resp_cli.status_code, 403)

        resp_stock = client_bodega.post(
            f'/api/v1/insumos/{self.insumo.pk}/ajustar_stock/',
            {'tipo_movimiento': 'ENTRADA_COMPRA', 'cantidad': '5.000', 'motivo': 'Compra JWT'},
            format='json',
        )
        self.assertEqual(resp_stock.status_code, 200)

        # VENTAS puede crear cliente y pedido, pero no mover Kanban (403)
        ventas_tokens = self._obtener_tokens('ventas_eva4')
        client_ventas = APIClient()
        client_ventas.credentials(HTTP_AUTHORIZATION=f"Bearer {ventas_tokens['access']}")

        cliente_resp = client_ventas.post(
            '/api/v1/clientes/',
            {
                'rut': '18.222.333-4',
                'nombre_completo': 'Cliente Ventas',
                'email': 'ventas@test.cl',
                'telefono': '+56912345678',
                'direccion_habitual': 'Av. Italia 500',
                'comuna': 'Providencia',
            },
            format='json',
        )
        self.assertEqual(cliente_resp.status_code, 201)
        cliente_id = cliente_resp.data['id']

        pedido_resp = client_ventas.post(
            '/api/v1/pedidos/',
            {
                'cliente': cliente_id,
                'producto_base': self.producto.pk,
                'porciones_solicitadas': 10,
                'nivel_complejidad': 'ESTANDAR',
                'modalidad_entrega': 'RETIRO_TIENDA',
            },
            format='json',
        )
        self.assertEqual(pedido_resp.status_code, 201)
        pedido_id = pedido_resp.data['id']

        resp_kanban_denegado = client_ventas.post(
            f'/api/v1/pedidos/{pedido_id}/mover_kanban/',
            {'nuevo_estado': 'EN_PREPARACION'},
            format='json',
        )
        self.assertEqual(resp_kanban_denegado.status_code, 403)

        # COCINA sí puede mover Kanban y dispara descuento BOM
        cocina_tokens = self._obtener_tokens('cocina_eva4')
        client_cocina = APIClient()
        client_cocina.credentials(HTTP_AUTHORIZATION=f"Bearer {cocina_tokens['access']}")
        resp_kanban_ok = client_cocina.post(
            f'/api/v1/pedidos/{pedido_id}/mover_kanban/',
            {'nuevo_estado': 'EN_PREPARACION'},
            format='json',
        )
        self.assertEqual(resp_kanban_ok.status_code, 200)
        self.assertTrue(resp_kanban_ok.data['pedido']['insumos_descontados'])

    def test_crud_completo_clientes_y_protected_error_409(self):
        admin_tokens = self._obtener_tokens('admin_eva4')
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {admin_tokens['access']}")

        # Validación RUT inválido -> 400
        bad_resp = client.post(
            '/api/v1/clientes/',
            {
                'rut': '123',
                'nombre_completo': 'Cliente Malo',
                'email': 'bad@test.cl',
                'telefono': '+56911111111',
                'direccion_habitual': 'Dir 1',
                'comuna': 'Santiago',
            },
            format='json',
        )
        self.assertEqual(bad_resp.status_code, 400)

        # Create -> Read -> Update -> Delete
        create_resp = client.post(
            '/api/v1/clientes/',
            {
                'rut': '19.444.555-6',
                'nombre_completo': 'Cliente CRUD Prueba',
                'email': 'crud@test.cl',
                'telefono': '+56999998888',
                'direccion_habitual': 'Av. Providencia 100',
                'comuna': 'Providencia',
            },
            format='json',
        )
        self.assertEqual(create_resp.status_code, 201)
        cid = create_resp.data['id']

        self.assertEqual(client.get(f'/api/v1/clientes/{cid}/').status_code, 200)
        patch_resp = client.patch(
            f'/api/v1/clientes/{cid}/',
            {'comuna': 'Ñuñoa'},
            format='json',
        )
        self.assertEqual(patch_resp.status_code, 200)
        self.assertEqual(patch_resp.data['comuna'], 'Ñuñoa')
        self.assertEqual(client.delete(f'/api/v1/clientes/{cid}/').status_code, 204)

        # ProtectedError -> 409 Conflict
        cliente_prot = Cliente.objects.create(
            rut='16.777.888-9',
            nombre_completo='Cliente Protegido',
            email='prot@test.cl',
            telefono='+56977776666',
            direccion_habitual='Av. Apoquindo 200',
            comuna='Las Condes',
        )
        PedidoPersonalizado.objects.create(
            cliente=cliente_prot,
            producto_base=self.producto,
            porciones_solicitadas=10,
        )
        del_prot = client.delete(f'/api/v1/clientes/{cliente_prot.pk}/')
        self.assertEqual(del_prot.status_code, 409)

    def test_password_hashing_argon2_con_salt_no_texto_plano(self):
        self.assertTrue(self.ventas_user.password.startswith('argon2$'))
        self.assertTrue(self.cocina_user.password.startswith('argon2$'))
        self.assertNotIn(self.password_raw, self.ventas_user.password)
        # Misma contraseña en dos usuarios genera distinto hash por salt aleatorio
        self.assertNotEqual(self.ventas_user.password, self.cocina_user.password)
        self.assertTrue(self.ventas_user.check_password(self.password_raw))

    def test_health_check_dashboard_y_openapi_docs(self):
        client = APIClient()
        health = client.get('/api/v1/health/')
        self.assertEqual(health.status_code, 200)
        self.assertTrue(health.data['database']['conectada'])

        admin_tokens = self._obtener_tokens('admin_eva4')
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {admin_tokens['access']}")

        dash = client.get('/api/v1/dashboard/resumen/')
        self.assertEqual(dash.status_code, 200)
        self.assertIn('kpis', dash.data)

        self.assertEqual(client.get('/api/v1/schema/').status_code, 200)
        self.assertEqual(client.get('/api/v1/docs/').status_code, 200)




