import { useEffect, useState } from 'react'
import { Calculator, Plus, Trash2, Eye, X } from 'lucide-react'
import { apiRequest } from '../services/api'

export default function PedidosView() {
  const [pedidos, setPedidos] = useState([])
  const [clientes, setClientes] = useState([])
  const [productos, setProductos] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [simulacion, setSimulacion] = useState(null)
  const [explosionModal, setExplosionModal] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [form, setForm] = useState({
    cliente: '',
    producto_base: '',
    porciones_solicitadas: 15,
    nivel_complejidad: 'PERSONALIZADO_MEDIO',
    modalidad_entrega: 'DESPACHO_DOMICILIO',
    dedicatoria_texto: '',
    prioridad: 'NORMAL',
  })

  async function cargarTodo() {
    try {
      const [pRes, cRes, prRes] = await Promise.all([
        apiRequest('/api/v1/pedidos/'),
        apiRequest('/api/v1/clientes/'),
        apiRequest('/api/v1/productos/'),
      ])
      const pList = pRes.results || pRes
      const cList = cRes.results || cRes
      const prList = prRes.results || prRes
      setPedidos(pList)
      setClientes(cList)
      setProductos(prList)
      setForm((prev) => ({
        ...prev,
        cliente: prev.cliente || cList[0]?.id || '',
        producto_base: prev.producto_base || prList[0]?.id || '',
      }))
    } catch (err) {
      setFeedback({ type: 'error', text: err.message })
    }
  }

  useEffect(() => {
    cargarTodo()
  }, [])

  async function simularCotizacion() {
    setFeedback(null)
    try {
      const data = await apiRequest('/api/v1/pedidos/simular_cotizacion/', {
        method: 'POST',
        body: {
          producto_base_id: Number(form.producto_base),
          porciones_solicitadas: Number(form.porciones_solicitadas),
          nivel_complejidad: form.nivel_complejidad,
          modalidad_entrega: form.modalidad_entrega,
        },
      })
      setSimulacion(data)
    } catch (err) {
      setFeedback({ type: 'error', text: `Error simulando cotización: ${err.message}` })
    }
  }

  async function crearPedido(e) {
    e.preventDefault()
    setFeedback(null)
    try {
      const created = await apiRequest('/api/v1/pedidos/', {
        method: 'POST',
        body: {
          cliente: Number(form.cliente),
          producto_base: Number(form.producto_base),
          porciones_solicitadas: Number(form.porciones_solicitadas),
          nivel_complejidad: form.nivel_complejidad,
          modalidad_entrega: form.modalidad_entrega,
          dedicatoria_texto: form.dedicatoria_texto,
          prioridad: form.prioridad,
          estado_comercial: 'CONFIRMADO',
        },
      })
      setFeedback({
        type: 'success',
        text: `POST 201 Created · Pedido ${created.codigo_pedido} creado en RDS ($${Number(created.precio_total).toLocaleString('es-CL')}).`,
      })
      setShowForm(false)
      setSimulacion(null)
      cargarTodo()
    } catch (err) {
      setFeedback({ type: 'error', text: `HTTP ${err.status || 400}: ${err.message}` })
    }
  }

  async function verExplosionBom(pedido) {
    try {
      const data = await apiRequest(`/api/v1/pedidos/${pedido.id}/explosion_bom/`)
      setExplosionModal(data)
    } catch (err) {
      setFeedback({ type: 'error', text: err.message })
    }
  }

  async function eliminarPedido(pedido) {
    if (!window.confirm(`¿Eliminar pedido ${pedido.codigo_pedido}?`)) return
    try {
      await apiRequest(`/api/v1/pedidos/${pedido.id}/`, { method: 'DELETE' })
      setFeedback({ type: 'success', text: `DELETE 204 · Pedido ${pedido.codigo_pedido} eliminado.` })
      cargarTodo()
    } catch (err) {
      setFeedback({ type: 'error', text: `HTTP ${err.status}: ${err.message}` })
    }
  }

  return (
    <div className="space-y-4">
      <div className="da-card p-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-[#462842]">Cotizaciones y Pedidos Personalizados (BOM)</h2>
          <p className="text-xs md:text-sm text-[#7f6a7c] mt-0.5">
            Simulador en tiempo real de Lista de Materiales (BOM), abonos 50% y registro directo en PostgreSQL RDS.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="btn-dulce inline-flex items-center gap-2 px-4 py-2 text-xs md:text-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" /> {showForm ? 'Cerrar Cotizador' : 'Nueva Cotización / Pedido'}
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

      {showForm && (
        <form onSubmit={crearPedido} className="da-card p-5 md:p-6 space-y-4">
          <div className="border-b border-[#f0e4ee] pb-3">
            <h3 className="font-extrabold text-[#462842]">Nuevo Pedido Personalizado</h3>
            <p className="text-xs text-[#7f6a7c]">Calcula automáticamente el costo de insumos escalado por porciones y verifica factibilidad en bodega.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div>
              <label className="block font-semibold text-[#5e3a5a] mb-1">Cliente</label>
              <select
                required
                value={form.cliente}
                onChange={(e) => setForm({ ...form, cliente: e.target.value })}
                className="w-full px-3 py-2 border border-[#e6d1e3] rounded-xl bg-[#fdf8fb]"
              >
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre_completo} ({c.rut})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-[#5e3a5a] mb-1">Receta / Producto Base</label>
              <select
                required
                value={form.producto_base}
                onChange={(e) => setForm({ ...form, producto_base: e.target.value })}
                className="w-full px-3 py-2 border border-[#e6d1e3] rounded-xl bg-[#fdf8fb]"
              >
                {productos.map((pr) => (
                  <option key={pr.id} value={pr.id}>
                    {pr.nombre} (Base {pr.porciones_base} porc.)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-[#5e3a5a] mb-1">Porciones Solicitadas</label>
              <input
                type="number"
                min="1"
                required
                value={form.porciones_solicitadas}
                onChange={(e) => setForm({ ...form, porciones_solicitadas: e.target.value })}
                className="w-full px-3 py-2 border border-[#e6d1e3] rounded-xl bg-[#fdf8fb]"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#5e3a5a] mb-1">Complejidad Artística</label>
              <select
                value={form.nivel_complejidad}
                onChange={(e) => setForm({ ...form, nivel_complejidad: e.target.value })}
                className="w-full px-3 py-2 border border-[#e6d1e3] rounded-xl bg-[#fdf8fb]"
              >
                <option value="ESTANDAR">Estándar (1.0x)</option>
                <option value="PERSONALIZADO_MEDIO">Personalizado Temático (1.25x)</option>
                <option value="ALTA_ESCULTURAL">Alta Escultural 3D (1.50x)</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-[#5e3a5a] mb-1">Modalidad de Entrega</label>
              <select
                value={form.modalidad_entrega}
                onChange={(e) => setForm({ ...form, modalidad_entrega: e.target.value })}
                className="w-full px-3 py-2 border border-[#e6d1e3] rounded-xl bg-[#fdf8fb]"
              >
                <option value="DESPACHO_DOMICILIO">Despacho Refrigerado ($5.000)</option>
                <option value="RETIRO_TIENDA">Retiro en Tienda ($0)</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-[#5e3a5a] mb-1">Prioridad Taller</label>
              <select
                value={form.prioridad}
                onChange={(e) => setForm({ ...form, prioridad: e.target.value })}
                className="w-full px-3 py-2 border border-[#e6d1e3] rounded-xl bg-[#fdf8fb]"
              >
                <option value="BAJA">Baja</option>
                <option value="NORMAL">Normal</option>
                <option value="ALTA">Alta</option>
                <option value="URGENTE">Urgente</option>
              </select>
            </div>
            <div className="md:col-span-3">
              <label className="block font-semibold text-[#5e3a5a] mb-1">Dedicatoria / Mensaje en Torta</label>
              <input
                value={form.dedicatoria_texto}
                onChange={(e) => setForm({ ...form, dedicatoria_texto: e.target.value })}
                placeholder="Ej. ¡Feliz Cumpleaños!"
                className="w-full px-3 py-2 border border-[#e6d1e3] rounded-xl bg-[#fdf8fb]"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={simularCotizacion}
              className="btn-dulce-outline inline-flex items-center gap-2 px-4 py-2 text-sm cursor-pointer"
            >
              <Calculator className="w-4 h-4 text-[#d9739f]" /> Simular Cotización &amp; Stock BOM
            </button>
            <button type="submit" className="btn-dulce px-4 py-2 text-sm cursor-pointer">
              Confirmar y Guardar Pedido (POST)
            </button>
          </div>

          {simulacion && (
            <div className="bg-gradient-to-r from-[#fff8fc] to-[#f8effb] border border-[#ebd4e7] rounded-2xl p-4 text-sm space-y-2">
              <div className="flex flex-wrap justify-between gap-2 font-bold text-[#462842]">
                <span>Total Cotizado: ${Number(simulacion.precio_total_cotizado).toLocaleString('es-CL')} CLP</span>
                <span className={simulacion.stock_factible ? 'text-emerald-700' : 'text-rose-700'}>
                  {simulacion.stock_factible ? '✔ Stock BOM Factible' : '✖ Déficit de Stock en Bodega'}
                </span>
              </div>
              <p className="text-xs text-[#6d546a]">
                Factor escala: {simulacion.factor_escala}x · Costo insumos BOM: ${Number(simulacion.costo_bom_estimado).toLocaleString('es-CL')} · Abono 50%: ${Number(simulacion.abono_minimo_50pct).toLocaleString('es-CL')}
              </p>
            </div>
          )}
        </form>
      )}

      <div className="da-card overflow-x-auto">
        <table className="da-table w-full text-sm text-left">
          <thead className="text-[11px] uppercase font-bold">
            <tr>
              <th className="px-4 py-3">Código</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Producto / Porciones</th>
              <th className="px-4 py-3">Kanban / BOM</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f6edf4]">
            {pedidos.map((p) => (
              <tr key={p.id} className="hover:bg-[#fdf8fb]">
                <td className="px-4 py-3">
                  <div className="font-mono font-extrabold text-[#c55d8b] text-xs">{p.codigo_pedido}</div>
                  <div className="text-[11px] text-[#7f6a7c]">{p.estado_comercial_display}</div>
                </td>
                <td className="px-4 py-3 font-medium text-[#462842]">{p.cliente_nombre}</td>
                <td className="px-4 py-3 text-[#5e3a5a]">
                  {p.producto_nombre} <span className="text-xs text-[#7f6a7c]">({p.porciones_solicitadas} porc.)</span>
                </td>
                <td className="px-4 py-3 space-y-1">
                  <span className="inline-block px-2.5 py-0.5 text-[11px] rounded-full bg-[#fdf2f8] text-[#5e3a5a] border border-[#f0d8ea] font-semibold">
                    {p.estado_kanban_display}
                  </span>
                  <div className="text-[11px]">
                    {p.insumos_descontados ? (
                      <span className="text-emerald-700 font-semibold">✔ BOM descontado</span>
                    ) : (
                      <span className="text-[#8f6f8b]">⏳ BOM pendiente</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-extrabold text-[#462842]">
                  ${Number(p.precio_total).toLocaleString('es-CL')}
                </td>
                <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => verExplosionBom(p)}
                    className="btn-dulce-outline inline-flex items-center gap-1 px-2.5 py-1 text-xs cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" /> BOM
                  </button>
                  <button
                    type="button"
                    onClick={() => eliminarPedido(p)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs border border-rose-200 text-rose-700 rounded-lg hover:bg-rose-50 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {explosionModal && (
        <div className="fixed inset-0 bg-[#462842]/45 backdrop-blur-[2px] flex items-center justify-center p-4 z-50">
          <div className="da-card max-w-2xl w-full overflow-hidden shadow-2xl">
            <div className="px-5 py-4 bg-gradient-to-r from-[#fde4ee] to-[#f1e1f8] border-b border-[#ebd4e7] flex items-center justify-between">
              <h3 className="font-extrabold text-[#462842]">Explosión BOM · {explosionModal.codigo_pedido}</h3>
              <button type="button" onClick={() => setExplosionModal(null)} className="text-[#5e3a5a] cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-sm max-h-[75vh] overflow-y-auto bg-white">
              <p className="text-[#5e3a5a] font-medium">
                {explosionModal.producto_base} · {explosionModal.porciones_solicitadas} porciones (Factor {explosionModal.factor_escala_porciones}x)
              </p>
              <table className="da-table w-full text-xs border border-[#f0e4ee] rounded-xl overflow-hidden">
                <thead>
                  <tr>
                    <th className="p-2.5 text-left">Insumo</th>
                    <th className="p-2.5 text-right">Requerido</th>
                    <th className="p-2.5 text-right">Stock Actual</th>
                    <th className="p-2.5 text-center">Factible</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f6edf4]">
                  {explosionModal.explosion_materiales.map((item) => (
                    <tr key={item.insumo_id}>
                      <td className="p-2.5 font-medium text-[#462842]">{item.nombre_insumo}</td>
                      <td className="p-2.5 text-right">{item.cantidad_requerida} {item.unidad_medida}</td>
                      <td className="p-2.5 text-right">{item.stock_disponible} {item.unidad_medida}</td>
                      <td className="p-2.5 text-center">{item.stock_suficiente ? '✅' : '❌'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
