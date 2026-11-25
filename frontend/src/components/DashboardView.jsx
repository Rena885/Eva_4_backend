import { useEffect, useState } from 'react'
import { Activity, Database, HardDrive, Shield, RefreshCw, ShoppingBag, AlertTriangle, Truck } from 'lucide-react'
import { apiRequest, fetchHealthRaw, getApiBaseUrl } from '../services/api'

export default function DashboardView() {
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
    return <div className="p-8 text-center text-stone-500">Consultando API RESTful y RDS...</div>
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl">
        Error cargando dashboard: {error}
      </div>
    )
  }

  const kpis = resumen?.kpis || {}
  const infra = resumen?.infraestructura || {}

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-stone-900">Panel Operativo & Arquitectura AWS</h2>
          <p className="text-sm text-stone-500">
            Datos obtenidos en vivo vía JSON + JWT desde <code className="bg-stone-100 px-1.5 py-0.5 rounded">{getApiBaseUrl()}</code>
          </p>
        </div>
        <button
          onClick={cargarDatos}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium bg-white border border-stone-300 rounded-lg hover:bg-stone-50"
        >
          <RefreshCw className="w-4 h-4" /> Actualizar
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Pedidos Activos" value={kpis.pedidos_activos ?? 0} subtitle={`En cocina: ${kpis.pedidos_en_cocina ?? 0}`} icon={ShoppingBag} color="rose" />
        <KpiCard title="Listos para Despacho" value={kpis.pedidos_listos_despacho ?? 0} subtitle="Control calidad aprobado" icon={Activity} color="emerald" />
        <KpiCard title="Insumos Stock Crítico" value={kpis.insumos_criticos ?? 0} subtitle="Bajo stock mínimo BOM" icon={AlertTriangle} color="amber" />
        <KpiCard title="Rutas Activas" value={kpis.rutas_activas ?? 0} subtitle={`Clientes registrados: ${kpis.total_clientes ?? 0}`} icon={Truck} color="sky" />
      </div>

      {/* Estado de Arquitectura Distribuida */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-stone-700 font-semibold text-sm mb-2">
            <Database className="w-4 h-4 text-sky-600" /> Base de Datos (RDS / PostgreSQL)
          </div>
          <p className="text-sm text-stone-600">
            Estado:{' '}
            <span className={`font-semibold ${health?.data?.database?.conectada ? 'text-emerald-600' : 'text-red-600'}`}>
              {health?.data?.database?.conectada ? 'Conectada (SELECT 1 OK)' : 'Desconectada'}
            </span>
          </p>
          <p className="text-xs text-stone-500 mt-1 font-mono">
            Motor: {infra.base_datos} · Host: {infra.db_host}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-stone-700 font-semibold text-sm mb-2">
            <HardDrive className="w-4 h-4 text-amber-600" /> Almacenamiento (S3 / Estáticos)
          </div>
          <p className="text-sm text-stone-600">
            Modo activo: <span className="font-semibold text-stone-900">{infra.storage}</span>
          </p>
          <p className="text-xs text-stone-500 mt-1 font-mono">
            Bucket: {health?.data?.storage?.bucket || 'Local WhiteNoise (USE_S3=False)'}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-stone-700 font-semibold text-sm mb-2">
            <Shield className="w-4 h-4 text-emerald-600" /> Seguridad API & Contraseñas
          </div>
          <p className="text-sm text-stone-600">
            Auth: <span className="font-semibold text-stone-900">JWT Bearer</span>
          </p>
          <p className="text-xs text-stone-500 mt-1 font-mono">
            Hasher: {infra.hasher_principal}
          </p>
        </div>
      </div>

      {/* Últimos pedidos */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-stone-200 flex items-center justify-between">
          <h3 className="font-semibold text-stone-800 text-sm">Últimos Pedidos Persistidos en PostgreSQL</h3>
          <span className="text-xs text-stone-500">GET /api/v1/dashboard/resumen/</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-stone-50 text-stone-600 text-xs uppercase">
              <tr>
                <th className="px-4 py-2.5">Código</th>
                <th className="px-4 py-2.5">Cliente</th>
                <th className="px-4 py-2.5">Producto Base</th>
                <th className="px-4 py-2.5">Etapa Kanban</th>
                <th className="px-4 py-2.5">BOM Descontado</th>
                <th className="px-4 py-2.5 text-right">Total CLP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {(resumen?.ultimos_pedidos || []).map((p) => (
                <tr key={p.id} className="hover:bg-stone-50">
                  <td className="px-4 py-2.5 font-mono font-semibold text-rose-700">{p.codigo_pedido}</td>
                  <td className="px-4 py-2.5">{p.cliente_nombre}</td>
                  <td className="px-4 py-2.5">{p.producto_nombre} ({p.porciones_solicitadas} porc.)</td>
                  <td className="px-4 py-2.5">
                    <span className="px-2 py-0.5 text-xs rounded-full bg-stone-100 font-medium">
                      {p.estado_kanban_display}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    {p.insumos_descontados ? (
                      <span className="text-emerald-700 font-medium text-xs">Sí</span>
                    ) : (
                      <span className="text-stone-400 text-xs">Pendiente</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold">
                    ${Number(p.precio_total).toLocaleString('es-CL')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function KpiCard({ title, value, subtitle, icon: Icon, color }) {
  const colors = {
    rose: 'bg-rose-50 text-rose-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    sky: 'bg-sky-50 text-sky-600',
  }
  return (
    <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm flex items-start justify-between">
      <div>
        <p className="text-xs font-medium text-stone-500 uppercase">{title}</p>
        <p className="text-2xl font-bold text-stone-900 mt-1">{value}</p>
        <p className="text-xs text-stone-500 mt-1">{subtitle}</p>
      </div>
      <div className={`p-2.5 rounded-lg ${colors[color] || colors.rose}`}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
  )
}
