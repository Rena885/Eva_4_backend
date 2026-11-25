import { useEffect, useState } from 'react'
import {
  Activity,
  Database,
  HardDrive,
  Shield,
  RefreshCw,
  ShoppingBag,
  AlertTriangle,
  Truck,
  DollarSign,
  Plus,
  Kanban,
  Package,
  ArrowRight,
  Clock,
} from 'lucide-react'
import { apiRequest, fetchHealthRaw } from '../services/api'

export default function DashboardView({ usuario = {}, onNavigate }) {
  const [resumen, setResumen] = useState(null)
  const [health, setHealth] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function cargarDatos() {
    setLoading(true)
    setError('')
    try {
      const [resData, healthRes] = await Promise.all([
        apiRequest('/api/v1/dashboard/resumen/'),
        fetchHealthRaw(),
      ])
      setResumen(resData)
      setHealth(healthRes)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarDatos()
  }, [])

  if (loading) {
    return (
      <div className="da-card p-10 text-center text-[#7f6a7c]">
        Cargando resumen del taller y estado de PostgreSQL RDS...
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-2xl">
        Error cargando dashboard: {error}
      </div>
    )
  }

  const kpis = resumen?.kpis || {}
  const infra = resumen?.infraestructura || {}
  const kanbanEtapas = resumen?.resumen_kanban || []
  const ultimosPedidos = resumen?.ultimos_pedidos || []
  const criticos = resumen?.insumos_criticos_lista || []
  const movimientos = resumen?.ultimos_movimientos || []
  const nombreSaludo = usuario.nombre_completo || usuario.username || 'Equipo Dulce Arte'

  return (
    <div className="space-y-6">
      {/* Saludo y accesos rápidos estilo Eva 3 */}
      <div className="da-card p-5 md:p-6 flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-white via-[#fff9fc] to-[#f8effb]">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold text-[#462842]">
            Hola, {nombreSaludo} 👋
          </h2>
          <p className="text-sm text-[#7f6a7c] mt-0.5">
            Resumen en vivo del taller Dulce Arte, producción Kanban, bodega BOM y entregas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigate?.('pedidos')}
            className="btn-dulce inline-flex items-center gap-1.5 px-3.5 py-2 text-xs md:text-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Nueva cotización
          </button>
          <button
            type="button"
            onClick={() => onNavigate?.('kanban')}
            className="btn-dulce-outline inline-flex items-center gap-1.5 px-3 py-2 text-xs md:text-sm cursor-pointer"
          >
            <Kanban className="w-4 h-4 text-[#d9739f]" /> Tablero de cocina
          </button>
          <button
            type="button"
            onClick={() => onNavigate?.('bodega')}
            className="btn-dulce-outline inline-flex items-center gap-1.5 px-3 py-2 text-xs md:text-sm cursor-pointer"
          >
            <Package className="w-4 h-4 text-[#9e7be6]" /> Bodega e insumos
          </button>
          <button
            type="button"
            onClick={() => onNavigate?.('despacho')}
            className="btn-dulce-outline inline-flex items-center gap-1.5 px-3 py-2 text-xs md:text-sm cursor-pointer"
          >
            <Truck className="w-4 h-4 text-[#5cb88a]" /> Despachos
          </button>
          <button
            type="button"
            onClick={cargarDatos}
            className="btn-dulce-outline inline-flex items-center gap-1.5 px-3 py-2 text-xs md:text-sm cursor-pointer"
            title="Actualizar métricas"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 4 KPIs estilo Eva 3 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Pedidos activos"
          value={kpis.pedidos_activos ?? 0}
          subtitle={`En cocina: ${kpis.pedidos_en_cocina ?? 0} · Listos: ${kpis.pedidos_listos_despacho ?? 0}`}
          icon={ShoppingBag}
          accent="da-kpi-rose"
          iconBg="bg-[#fdebf3] text-[#d9739f]"
        />
        <KpiCard
          title="Ventas cotizadas"
          value={`$${Number(kpis.ingresos_totales || 0).toLocaleString('es-CL')}`}
          subtitle={`${kpis.total_pedidos ?? 0} pedidos · ${kpis.total_clientes ?? 0} clientes`}
          icon={DollarSign}
          accent="da-kpi-lavender"
          iconBg="bg-[#f2ebfc] text-[#8c62d9]"
        />
        <KpiCard
          title="Alertas de stock"
          value={kpis.insumos_criticos ?? 0}
          subtitle="Insumos bajo mínimo BOM"
          icon={AlertTriangle}
          accent="da-kpi-peach"
          iconBg="bg-[#fff1ea] text-[#e07a52]"
        />
        <KpiCard
          title="Rutas y entregas"
          value={kpis.rutas_activas ?? 0}
          subtitle={`Paradas pendientes: ${kpis.entregas_pendientes ?? 0}`}
          icon={Truck}
          accent="da-kpi-mint"
          iconBg="bg-[#e8f8f0] text-[#3c9d6e]"
        />
      </div>

      {/* Estado del taller de cocina (5 etapas Kanban Eva 3) */}
      <div className="da-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="font-bold text-[#462842] text-base">Estado del taller de cocina</h3>
            <p className="text-xs text-[#7f6a7c]">
              Distribución actual de pedidos en las 5 etapas del tablero Kanban.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate?.('kanban')}
            className="text-xs font-semibold text-[#c55d8b] hover:underline inline-flex items-center gap-1 cursor-pointer"
          >
            Abrir tablero completo <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {kanbanEtapas.map((etapa, idx) => (
            <button
              key={etapa.codigo}
              type="button"
              onClick={() => onNavigate?.('kanban')}
              className="da-stage text-left cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wide text-[#8f6f8b]">
                  Etapa {idx + 1}
                </span>
                <span className="text-xl font-extrabold text-[#462842]">{etapa.cantidad}</span>
              </div>
              <div className="text-xs font-semibold text-[#5e3a5a] mt-1 truncate">
                {etapa.etiqueta}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Dos columnas principales: Próximas entregas + Bodega e insumos */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Próximas entregas / Últimos pedidos */}
        <div className="da-card lg:col-span-7 overflow-hidden">
          <div className="px-5 py-4 border-b border-[#f0e4ee] flex items-center justify-between">
            <div>
              <h3 className="font-bold text-[#462842] text-sm">Próximas entregas y últimos pedidos</h3>
              <p className="text-xs text-[#7f6a7c]">Pedidos persistidos en PostgreSQL RDS</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate?.('pedidos')}
              className="text-xs font-semibold text-[#c55d8b] hover:underline cursor-pointer"
            >
              Ver pedidos →
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="da-table w-full text-sm text-left">
              <thead className="text-[11px] uppercase font-bold">
                <tr>
                  <th className="px-4 py-3">Pedido</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Etapa</th>
                  <th className="px-4 py-3">BOM</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f6edf4]">
                {ultimosPedidos.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-xs text-[#7f6a7c]">
                      No hay pedidos registrados aún.
                    </td>
                  </tr>
                ) : (
                  ultimosPedidos.map((p) => (
                    <tr key={p.id} className="hover:bg-[#fdf8fb]">
                      <td className="px-4 py-3">
                        <div className="font-mono text-xs font-bold text-[#c55d8b]">{p.codigo_pedido}</div>
                        <div className="text-xs text-[#7f6a7c]">{p.producto_nombre}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-[#3c2a3a] text-xs">{p.cliente_nombre}</div>
                        <div className="text-[11px] text-[#7f6a7c]">{p.porciones_solicitadas} porciones</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2.5 py-0.5 text-[11px] rounded-full bg-[#fdf2f8] text-[#5e3a5a] border border-[#f0d8ea] font-semibold">
                          {p.estado_kanban_display}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {p.insumos_descontados ? (
                          <span className="text-emerald-700 font-semibold">✔ Descontado</span>
                        ) : (
                          <span className="text-[#8f6f8b]">Pendiente</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-[#462842] text-xs">
                        ${Number(p.precio_total).toLocaleString('es-CL')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bodega e insumos + Últimos movimientos */}
        <div className="da-card lg:col-span-5 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#f0e4ee] pb-3">
            <div>
              <h3 className="font-bold text-[#462842] text-sm">Bodega e insumos críticos</h3>
              <p className="text-xs text-[#7f6a7c]">Control de stock mínimo y movimientos Kardex</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate?.('bodega')}
              className="text-xs font-semibold text-[#c55d8b] hover:underline cursor-pointer"
            >
              Ir a bodega →
            </button>
          </div>

          {criticos.length === 0 ? (
            <div className="rounded-xl bg-[#eefbf4] border border-[#ccecd9] p-3 text-xs text-emerald-800">
              Todos los insumos activos superan su stock mínimo configurado.
            </div>
          ) : (
            <div className="space-y-2">
              {criticos.map((ins) => (
                <div
                  key={ins.id}
                  className="flex items-center justify-between rounded-xl bg-[#fff5f0] border border-[#fbd8c9] px-3 py-2 text-xs"
                >
                  <div>
                    <div className="font-bold text-[#462842]">{ins.nombre}</div>
                    <div className="text-[11px] text-[#7f6a7c]">Mínimo: {ins.stock_minimo} {ins.unidad_medida}</div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-white text-[#c9522d] font-bold border border-[#fbd8c9]">
                    {ins.stock_actual} {ins.unidad_medida}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="pt-2 border-t border-[#f0e4ee]">
            <h4 className="text-xs font-bold uppercase tracking-wide text-[#7f6a7c] mb-2 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#d9739f]" /> Últimos movimientos de inventario
            </h4>
            {movimientos.length === 0 ? (
              <p className="text-xs text-[#7f6a7c]">Sin movimientos recientes registrados.</p>
            ) : (
              <div className="space-y-1.5">
                {movimientos.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between text-xs bg-[#fdf8fb] border border-[#f0e4ee] rounded-xl px-3 py-2"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="font-semibold text-[#462842] truncate">{m.insumo_nombre}</div>
                      <div className="text-[11px] text-[#7f6a7c] truncate">
                        {m.tipo_movimiento_display} {m.pedido_codigo ? `· ${m.pedido_codigo}` : ''}
                      </div>
                    </div>
                    <span className="font-mono font-bold text-[#5e3a5a] shrink-0">
                      {m.cantidad} {m.unidad_medida}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Estado compacto de Arquitectura AWS (EVA 4) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="da-card p-4">
          <div className="flex items-center gap-2 text-[#462842] font-bold text-xs uppercase tracking-wide mb-1.5">
            <Database className="w-4 h-4 text-[#d9739f]" /> Base de Datos RDS
          </div>
          <p className="text-sm text-[#3c2a3a]">
            Estado:{' '}
            <span className={`font-bold ${health?.data?.database?.conectada ? 'text-emerald-700' : 'text-rose-700'}`}>
              {health?.data?.database?.conectada ? 'Conectada (SELECT 1 OK)' : 'Desconectada'}
            </span>
          </p>
          <p className="text-[11px] text-[#7f6a7c] mt-1 font-mono truncate">
            {infra.base_datos} · {infra.db_host}
          </p>
        </div>

        <div className="da-card p-4">
          <div className="flex items-center gap-2 text-[#462842] font-bold text-xs uppercase tracking-wide mb-1.5">
            <HardDrive className="w-4 h-4 text-[#9e7be6]" /> Almacenamiento S3
          </div>
          <p className="text-sm text-[#3c2a3a]">
            Modo activo: <span className="font-bold">{infra.storage}</span>
          </p>
          <p className="text-[11px] text-[#7f6a7c] mt-1 font-mono truncate">
            Bucket: {health?.data?.storage?.bucket || 'Local WhiteNoise'}
          </p>
        </div>

        <div className="da-card p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-[#462842] font-bold text-xs uppercase tracking-wide mb-1.5">
              <Shield className="w-4 h-4 text-[#5cb88a]" /> Seguridad API &amp; JWT
            </div>
            <p className="text-sm text-[#3c2a3a]">
              Hasher: <span className="font-bold">{infra.hasher_principal}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate?.('seguridad')}
            className="text-left text-xs font-semibold text-[#c55d8b] hover:underline mt-2 inline-flex items-center gap-1 cursor-pointer"
          >
            <Activity className="w-3.5 h-3.5" /> Probar JWT y Rate Limit API Gateway →
          </button>
        </div>
      </div>
    </div>
  )
}

function KpiCard({ title, value, subtitle, icon: Icon, accent, iconBg }) {
  return (
    <div className={`da-kpi-card ${accent} p-4 flex items-start justify-between gap-3`}>
      <div>
        <p className="text-[11px] font-bold text-[#7f6a7c] uppercase tracking-wide">{title}</p>
        <p className="text-2xl font-extrabold text-[#462842] mt-1">{value}</p>
        <p className="text-xs text-[#7f6a7c] mt-1">{subtitle}</p>
      </div>
      <div className={`p-2.5 rounded-xl ${iconBg}`}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
  )
}
