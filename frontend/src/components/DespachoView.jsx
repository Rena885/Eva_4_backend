import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, PenTool, X, Play, Snowflake } from 'lucide-react'
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

  async function iniciarRuta(ruta) {
    setFeedback(null)
    try {
      await apiRequest(`/api/v1/rutas-despacho/${ruta.id}/`, {
        method: 'PATCH',
        body: { estado_ruta: 'EN_RUTA' },
      })
      setFeedback({ type: 'success', text: `Ruta ${ruta.codigo_ruta} iniciada (En Ruta).` })
      cargarRutas()
    } catch (err) {
      setFeedback({ type: 'error', text: `HTTP ${err.status || 400}: ${err.message}` })
    }
  }

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
    ctx.strokeStyle = '#5e3a5a'
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
      <div className="da-card p-5">
        <h2 className="text-xl font-extrabold text-[#462842]">Gestión de Rutas de Despacho &amp; Firma Digital</h2>
        <p className="text-xs md:text-sm text-[#7f6a7c] mt-0.5">
          Planificación de salidas refrigeradas, seguimiento de paradas y recepción conforme mediante Canvas HTML5 Base64.
        </p>
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

      {rutas.map((ruta) => (
        <div key={ruta.id} className="da-card overflow-hidden">
          <div className="px-5 py-4 bg-gradient-to-r from-[#fff8fc] to-[#f8effb] border-b border-[#f0e4ee] flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-lg bg-[#462842] text-white font-mono text-xs font-bold">
                  {ruta.codigo_ruta}
                </span>
                <h3 className="font-extrabold text-[#462842] text-base">{ruta.nombre_ruta}</h3>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#fdf2f8] text-[#c55d8b] border border-[#f2d6e7]">
                  {ruta.estado_ruta_display}
                </span>
              </div>
              <div className="text-xs text-[#6d546a] flex flex-wrap items-center gap-3">
                <span>Repartidor: <strong>{ruta.repartidor_nombre}</strong></span>
                {ruta.vehiculo_patente && (
                  <span className="inline-flex items-center gap-1">
                    <Snowflake className="w-3.5 h-3.5 text-sky-600" />
                    {ruta.vehiculo_patente} ({ruta.temperatura_salida_c}°C)
                  </span>
                )}
              </div>
            </div>

            {ruta.estado_ruta === 'PLANIFICADA' && (
              <button
                type="button"
                onClick={() => iniciarRuta(ruta)}
                className="btn-dulce inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" /> Iniciar Salida a Ruta
              </button>
            )}
          </div>

          {/* Barra de Progreso Eva 3 */}
          <div className="px-5 py-3 bg-white border-b border-[#f6edf4]">
            <div className="flex justify-between text-xs text-[#7f6a7c] mb-1.5">
              <span>Progreso de Entregas en Ruta</span>
              <strong className="text-[#462842]">
                {ruta.paradas_entregadas} de {ruta.total_paradas} paradas ({ruta.porcentaje_completado}%)
              </strong>
            </div>
            <progress
              className="da-progress"
              value={ruta.porcentaje_completado || 0}
              max="100"
            />
          </div>

          <div className="divide-y divide-[#f6edf4]">
            {(ruta.entregas || []).map((ent) => (
              <div key={ent.id} className="p-4 md:px-5 flex flex-wrap items-center justify-between gap-3 text-sm hover:bg-[#fdf8fb]">
                <div>
                  <span className="font-mono font-extrabold text-[#c55d8b] text-xs">
                    Parada #{ent.orden_parada} · {ent.pedido_codigo}
                  </span>
                  <p className="text-xs font-semibold text-[#462842] mt-0.5">{ent.cliente_nombre}</p>
                  <p className="text-xs text-[#7f6a7c]">
                    {ent.direccion_destino} ({ent.comuna_destino})
                  </p>
                </div>
                {ent.estado_entrega === 'ENTREGADO' ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-[#eefbf4] border border-[#bfe8d1] px-3 py-1.5 rounded-full">
                    <CheckCircle2 className="w-4 h-4" /> Entregado ({ent.nombre_receptor})
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => abrirFirma(ent)}
                    className="btn-dulce inline-flex items-center gap-1.5 text-xs px-3.5 py-1.5 cursor-pointer"
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
        <div className="fixed inset-0 bg-[#462842]/45 backdrop-blur-[2px] flex items-center justify-center p-4 z-50">
          <div className="da-card max-w-md w-full overflow-hidden shadow-2xl">
            <div className="px-5 py-4 bg-gradient-to-r from-[#fde4ee] to-[#f1e1f8] border-b border-[#ebd4e7] flex items-center justify-between">
              <h3 className="font-extrabold text-[#462842]">Firma Digital · {despachoActivo.pedido_codigo}</h3>
              <button type="button" onClick={() => setDespachoActivo(null)} className="text-[#5e3a5a] cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={confirmarEntrega} className="p-5 space-y-3 text-sm bg-white">
              <div>
                <label className="block font-semibold text-[#5e3a5a] mb-1">Nombre Receptor *</label>
                <input
                  required
                  value={receptor.nombre_receptor}
                  onChange={(e) => setReceptor({ ...receptor, nombre_receptor: e.target.value })}
                  className="w-full px-3 py-2 border border-[#e6d1e3] rounded-xl bg-[#fdf8fb]"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#5e3a5a] mb-1">RUT Receptor *</label>
                <input
                  required
                  placeholder="17.456.890-1"
                  value={receptor.rut_receptor}
                  onChange={(e) => setReceptor({ ...receptor, rut_receptor: e.target.value })}
                  className="w-full px-3 py-2 border border-[#e6d1e3] rounded-xl bg-[#fdf8fb]"
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-semibold text-[#5e3a5a]">Firma en Pantalla *</label>
                  <button type="button" onClick={limpiarCanvas} className="text-xs font-semibold text-[#c55d8b] hover:underline cursor-pointer">
                    Limpiar firma
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
                  className="w-full border-2 border-dashed border-[#e6d1e3] rounded-2xl bg-[#fdf8fb] touch-none cursor-crosshair"
                />
              </div>
              <button type="submit" className="btn-dulce w-full py-2.5 cursor-pointer">
                Confirmar Entrega Digital en API
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
