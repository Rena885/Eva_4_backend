import { useEffect, useState } from 'react'
import { ArrowRight, RefreshCw, GripVertical } from 'lucide-react'
import { apiRequest } from '../services/api'

const COLUMNAS = [
  { key: 'RECIBIDO', label: '1. Recibido', sub: 'Cola de entrada' },
  { key: 'EN_PREPARACION', label: '2. En Preparación', sub: 'Descuenta stock BOM' },
  { key: 'HORNEADO_DECORADO', label: '3. Horneado / Decorado', sub: 'Armado artesanal' },
  { key: 'CONTROL_CALIDAD', label: '4. Control Calidad', sub: 'Cadena de frío & acabado' },
  { key: 'LISTO', label: '5. Listo', sub: 'Preparado para despacho' },
]

export default function KanbanView() {
  const [pedidos, setPedidos] = useState([])
  const [feedback, setFeedback] = useState(null)
  const [loading, setLoading] = useState(true)
  const [draggedId, setDraggedId] = useState(null)
  const [dragOverCol, setDragOverCol] = useState(null)
  const [seleccionCol, setSeleccionCol] = useState({})

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
    if (!nuevoEstado) return
    setFeedback(null)
    try {
      const resp = await apiRequest(`/api/v1/pedidos/${pedidoId}/mover_kanban/`, {
        method: 'POST',
        body: { nuevo_estado: nuevoEstado, comentario: 'Actualizado desde Tablero Kanban Dulce Arte (JWT).' },
      })
      setFeedback({ type: 'success', text: resp.mensaje })
      cargar()
    } catch (err) {
      setFeedback({ type: 'error', text: `HTTP ${err.status || 400}: ${err.message}` })
    }
  }

  function handleDragStart(e, pedido) {
    setDraggedId(pedido.id)
    e.dataTransfer.setData('text/plain', String(pedido.id))
  }

  function handleDragOver(e, colKey) {
    e.preventDefault()
    if (dragOverCol !== colKey) setDragOverCol(colKey)
  }

  function handleDrop(e, colKey) {
    e.preventDefault()
    const rawId = e.dataTransfer.getData('text/plain') || draggedId
    setDragOverCol(null)
    setDraggedId(null)
    const pedido = pedidos.find((p) => String(p.id) === String(rawId))
    if (pedido && pedido.estado_kanban !== colKey) {
      moverEtapa(pedido.id, colKey)
    }
  }

  return (
    <div className="space-y-4">
      <div className="da-card p-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-[#462842]">Tablero Kanban Taller de Cocina</h2>
          <p className="text-xs md:text-sm text-[#7f6a7c] mt-0.5">
            Arrastra y suelta las tarjetas o usa los botones rápidos. Al pasar a <strong>En Preparación</strong> se ejecuta el descuento atómico BOM en PostgreSQL RDS.
          </p>
        </div>
        <button
          type="button"
          onClick={cargar}
          className="btn-dulce-outline inline-flex items-center gap-2 px-3.5 py-2 text-xs md:text-sm cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" /> Recargar tablero
        </button>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-2xl text-sm border ${
            feedback.type === 'success'
              ? 'bg-[#eefbf4] border-[#bfe8d1] text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {loading ? (
        <div className="da-card p-10 text-center text-[#7f6a7c]">Cargando tablero Kanban del taller...</div>
      ) : (
        <div className="kanban-board">
          {COLUMNAS.map((col, idx) => {
            const tarjetas = pedidos.filter((p) => p.estado_kanban === col.key)
            const siguiente = COLUMNAS[idx + 1]
            return (
              <div
                key={col.key}
                onDragOver={(e) => handleDragOver(e, col.key)}
                onDragLeave={() => setDragOverCol(null)}
                onDrop={(e) => handleDrop(e, col.key)}
                className={`kanban-column ${dragOverCol === col.key ? 'drag-over' : ''}`}
              >
                <div className="kanban-column-header flex items-center justify-between gap-2">
                  <div>
                    <div className="font-bold text-xs text-[#462842] uppercase tracking-wide">{col.label}</div>
                    <div className="text-[11px] text-[#7f6a7c]">{col.sub}</div>
                  </div>
                  <span className="text-xs font-extrabold bg-white text-[#5e3a5a] px-2.5 py-0.5 rounded-full border border-[#ebd4e7]">
                    {tarjetas.length}
                  </span>
                </div>

                <div className="space-y-2.5 flex-1">
                  {tarjetas.length === 0 ? (
                    <div className="text-center text-xs text-[#9c8499] py-8 border border-dashed border-[#e8d5e5] rounded-xl">
                      Sin pedidos en esta etapa
                    </div>
                  ) : (
                    tarjetas.map((p) => (
                      <div
                        key={p.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, p)}
                        onDragEnd={() => {
                          setDraggedId(null)
                          setDragOverCol(null)
                        }}
                        className={`kanban-card prioridad-${p.prioridad || 'NORMAL'} space-y-2`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="inline-flex items-center gap-1 font-mono text-xs font-extrabold text-[#c55d8b]">
                            <GripVertical className="w-3.5 h-3.5 text-[#b59bb2]" />
                            {p.codigo_pedido}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              p.insumos_descontados
                                ? 'bg-[#eefbf4] text-emerald-700 border-[#c7ebd7]'
                                : 'bg-[#fff7ea] text-amber-800 border-[#f5deb3]'
                            }`}
                          >
                            {p.insumos_descontados ? '✔ BOM OK' : '⏳ BOM Pend.'}
                          </span>
                        </div>

                        <div>
                          <p className="text-xs font-bold text-[#462842]">{p.producto_nombre}</p>
                          <p className="text-[11px] text-[#7f6a7c]">
                            {p.cliente_nombre} · <strong>{p.porciones_solicitadas} porc.</strong>
                          </p>
                        </div>

                        {(p.sabor_bizcocho || p.relleno_principal || p.alergias_considerar) && (
                          <div className="p-2 rounded-lg bg-[#fdf8fb] border border-[#f0e4ee] text-[11px] space-y-0.5 text-[#5e3a5a]">
                            {p.sabor_bizcocho && <div><strong>Masa:</strong> {p.sabor_bizcocho}</div>}
                            {p.relleno_principal && <div><strong>Relleno:</strong> {p.relleno_principal}</div>}
                            {p.alergias_considerar && (
                              <div className="text-rose-700 font-bold">⚠️ {p.alergias_considerar}</div>
                            )}
                          </div>
                        )}

                        <div className="flex gap-1 pt-1 border-t border-[#f4e8f2]">
                          <select
                            value={seleccionCol[p.id] || p.estado_kanban}
                            onChange={(e) => setSeleccionCol({ ...seleccionCol, [p.id]: e.target.value })}
                            className="flex-1 text-[11px] px-2 py-1 border border-[#e6d1e3] rounded-lg bg-[#fdf8fb] text-[#462842]"
                          >
                            {COLUMNAS.map((opt) => (
                              <option key={opt.key} value={opt.key}>{opt.label}</option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => moverEtapa(p.id, seleccionCol[p.id] || (siguiente ? siguiente.key : p.estado_kanban))}
                            className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-[#5e3a5a] text-white hover:bg-[#d9739f] transition cursor-pointer inline-flex items-center gap-1"
                          >
                            {siguiente && (!seleccionCol[p.id] || seleccionCol[p.id] === p.estado_kanban) ? (
                              <>Avanzar <ArrowRight className="w-3 h-3" /></>
                            ) : (
                              'Mover'
                            )}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
