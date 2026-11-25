import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, PenTool, X } from 'lucide-react'
import { apiRequest } from '../services/api'

export default function DespachoView() {
  const [rutas, setRutas] = useState([])
  const [despachoActivo, setDespachoActivo] = useState(null)
  const [receptor, setReceptor] = useState({ nombre_receptor: '', rut_receptor: '' })
  const [feedback, setFeedback] = useState(null)
  const canvasRef = useRef(null)
  const drawingRef = useRef(false)

  async function cargarRutas() {
    try {
      const data = await apiRequest('/api/v1/rutas-despacho/')
      setRutas(data.results || data)
    } catch (err) {
      setFeedback({ type: 'error', text: err.message })
    }
  }

  useEffect(() => {
    cargarRutas()
  }, [])

  function abrirFirma(entrega) {
    setDespachoActivo(entrega)
    setReceptor({ nombre_receptor: entrega.cliente_nombre || '', rut_receptor: '' })
  }

  function iniciarTrazo(e) {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const rect = canvas.getBoundingClientRect()
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top
    drawingRef.current = true
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  function moverTrazo(e) {
    if (!drawingRef.current || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const rect = canvas.getBoundingClientRect()
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#1c1917'
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  function terminarTrazo() {
    drawingRef.current = false
  }

  function limpiarCanvas() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  async function confirmarEntrega(e) {
    e.preventDefault()
    if (!canvasRef.current || !despachoActivo) return
    const firmaBase64 = canvasRef.current.toDataURL('image/png')
    setFeedback(null)
    try {
      const resp = await apiRequest(`/api/v1/despachos/${despachoActivo.id}/confirmar_entrega/`, {
        method: 'POST',
        body: {
          nombre_receptor: receptor.nombre_receptor,
          rut_receptor: receptor.rut_receptor,
          firma_digital_base64: firmaBase64,
        },
      })
      setFeedback({ type: 'success', text: resp.mensaje })
      setDespachoActivo(null)
      cargarRutas()
    } catch (err) {
      setFeedback({ type: 'error', text: `HTTP ${err.status || 400}: ${err.message}` })
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-stone-900">Rutas de Despacho & Firma Digital</h2>
        <p className="text-sm text-stone-500">
          Endpoint <code className="bg-stone-100 px-1.5 py-0.5 rounded">/api/v1/rutas-despacho/</code> · Confirmación en destino vía Canvas Base64
        </p>
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

      {rutas.map((ruta) => (
        <div key={ruta.id} className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 bg-stone-50 border-b border-stone-200 flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="font-mono text-xs font-bold text-rose-700">{ruta.codigo_ruta}</span>
              <h3 className="font-bold text-stone-900 text-sm">{ruta.nombre_ruta}</h3>
            </div>
            <div className="text-xs text-stone-600">
              Repartidor: <strong>{ruta.repartidor_nombre}</strong> · Avance: {ruta.porcentaje_completado}% ({ruta.estado_ruta_display})
            </div>
          </div>

          <div className="divide-y divide-stone-100">
            {(ruta.entregas || []).map((ent) => (
              <div key={ent.id} className="p-4 flex flex-wrap items-center justify-between gap-3 text-sm">
                <div>
                  <span className="font-mono font-semibold text-stone-800">Parada #{ent.orden_parada} · {ent.pedido_codigo}</span>
                  <p className="text-xs text-stone-600">
                    {ent.cliente_nombre} — {ent.direccion_destino} ({ent.comuna_destino})
                  </p>
                </div>
                {ent.estado_entrega === 'ENTREGADO' ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full">
                    <CheckCircle2 className="w-4 h-4" /> Entregado ({ent.nombre_receptor})
                  </span>
                ) : (
                  <button
                    onClick={() => abrirFirma(ent)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold bg-rose-600 text-white px-3 py-1.5 rounded-lg hover:bg-rose-700"
                  >
                    <PenTool className="w-3.5 h-3.5" /> Confirmar con Firma
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {despachoActivo && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-200 flex items-center justify-between">
              <h3 className="font-bold">Firma Digital · {despachoActivo.pedido_codigo}</h3>
              <button onClick={() => setDespachoActivo(null)}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={confirmarEntrega} className="p-5 space-y-3 text-sm">
              <div>
                <label className="block font-medium text-stone-700 mb-1">Nombre Receptor *</label>
                <input
                  required
                  value={receptor.nombre_receptor}
                  onChange={(e) => setReceptor({ ...receptor, nombre_receptor: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-medium text-stone-700 mb-1">RUT Receptor *</label>
                <input
                  required
                  placeholder="17.456.890-1"
                  value={receptor.rut_receptor}
                  onChange={(e) => setReceptor({ ...receptor, rut_receptor: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg"
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-medium text-stone-700">Firma en Pantalla *</label>
                  <button type="button" onClick={limpiarCanvas} className="text-xs text-rose-600 hover:underline">
                    Limpiar
                  </button>
                </div>
                <canvas
                  ref={canvasRef}
                  width={360}
                  height={140}
                  onMouseDown={iniciarTrazo}
                  onMouseMove={moverTrazo}
                  onMouseUp={terminarTrazo}
                  onMouseLeave={terminarTrazo}
                  onTouchStart={iniciarTrazo}
                  onTouchMove={moverTrazo}
                  onTouchEnd={terminarTrazo}
                  className="w-full border-2 border-dashed border-stone-300 rounded-xl bg-stone-50 touch-none cursor-crosshair"
                />
              </div>
              <button type="submit" className="w-full bg-rose-600 text-white font-semibold py-2.5 rounded-lg hover:bg-rose-700">
                Confirmar Entrega en API
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
