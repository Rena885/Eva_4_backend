import { useEffect, useState } from 'react'
import { ArrowRight, RefreshCw } from 'lucide-react'
import { apiRequest } from '../services/api'

const COLUMNAS = [
  { key: 'RECIBIDO', label: '1. Recibido' },
  { key: 'EN_PREPARACION', label: '2. En Preparación (BOM)' },
  { key: 'HORNEADO_DECORADO', label: '3. Horneado / Decorado' },
  { key: 'CONTROL_CALIDAD', label: '4. Control Calidad' },
  { key: 'LISTO', label: '5. Listo' },
]

export default function KanbanView() {
  const [pedidos, setPedidos] = useState([])
  const [feedback, setFeedback] = useState(null)
  const [loading, setLoading] = useState(true)

  async function cargar() {
    setLoading(true)
    try {
      const data = await apiRequest('/api/v1/pedidos/')
      setPedidos(data.results || data)
    } catch (err) {
      setFeedback({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargar()
  }, [])

  async function moverEtapa(pedidoId, nuevoEstado) {
    setFeedback(null)
    try {
      const resp = await apiRequest(`/api/v1/pedidos/${pedidoId}/mover_kanban/`, {
        method: 'POST',
        body: { nuevo_estado: nuevoEstado, comentario: 'Actualizado desde SPA EC2 Frontend (JWT).' },
      })
      setFeedback({ type: 'success', text: resp.mensaje })
      cargar()
    } catch (err) {
      setFeedback({ type: 'error', text: `HTTP ${err.status || 400}: ${err.message}` })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-stone-900">Tablero Kanban de Cocina</h2>
          <p className="text-sm text-stone-500">
            Al avanzar a <strong>En Preparación</strong>, se ejecuta automáticamente el descuento atómico BOM en PostgreSQL RDS.
          </p>
        </div>
        <button
          onClick={cargar}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg hover:bg-stone-50"
        >
          <RefreshCw className="w-4 h-4" /> Recargar
        </button>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-lg text-sm border ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center text-stone-500">Cargando tablero Kanban...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {COLUMNAS.map((col, idx) => {
            const tarjetas = pedidos.filter((p) => p.estado_kanban === col.key)
            const siguiente = COLUMNAS[idx + 1]
            return (
              <div key={col.key} className="bg-stone-100 rounded-xl p-3 border border-stone-200 flex flex-col gap-2.5 min-h-[320px]">
                <div className="flex items-center justify-between pb-2 border-b border-stone-200">
                  <span className="font-semibold text-xs text-stone-700 uppercase">{col.label}</span>
                  <span className="text-xs font-bold bg-white px-2 py-0.5 rounded-full border border-stone-200">
                    {tarjetas.length}
                  </span>
                </div>

                {tarjetas.map((p) => (
                  <div key={p.id} className="bg-white rounded-lg p-3 border border-stone-200 shadow-sm space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-rose-700">{p.codigo_pedido}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${p.insumos_descontados ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                        {p.insumos_descontados ? 'BOM OK' : 'Sin BOM'}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-stone-900">{p.producto_nombre}</p>
                    <p className="text-[11px] text-stone-500">{p.cliente_nombre} · {p.porciones_solicitadas} porc.</p>

                    {siguiente && (
                      <button
                        onClick={() => moverEtapa(p.id, siguiente.key)}
                        className="w-full inline-flex items-center justify-center gap-1 text-xs font-medium bg-stone-900 text-white py-1.5 rounded-md hover:bg-rose-600 transition"
                      >
                        Mover a {siguiente.label.split('.')[1]} <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
