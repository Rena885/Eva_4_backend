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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-stone-900">Pedidos & Cotizador BOM</h2>
          <p className="text-sm text-stone-500">
            Endpoint <code className="bg-stone-100 px-1.5 py-0.5 rounded">/api/v1/pedidos/</code> + Simulador en vivo de Lista de Materiales
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg text-sm font-semibold"
        >
          <Plus className="w-4 h-4" /> {showForm ? 'Cerrar Cotizador' : 'Cotizar y Crear Pedido'}
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

      {showForm && (
        <form onSubmit={crearPedido} className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm space-y-4">
          <h3 className="font-bold text-stone-800">Nuevo Pedido Personalizado</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div>
              <label className="block font-medium text-stone-700 mb-1">Cliente</label>
              <select
                required
                value={form.cliente}
                onChange={(e) => setForm({ ...form, cliente: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg"
              >
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre_completo} ({c.rut})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-medium text-stone-700 mb-1">Receta / Producto Base</label>
              <select
                required
                value={form.producto_base}
                onChange={(e) => setForm({ ...form, producto_base: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg"
              >
                {productos.map((pr) => (
                  <option key={pr.id} value={pr.id}>
                    {pr.nombre} (Base {pr.porciones_base} porc.)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-medium text-stone-700 mb-1">Porciones Solicitadas</label>
              <input
                type="number"
                min="1"
                required
                value={form.porciones_solicitadas}
                onChange={(e) => setForm({ ...form, porciones_solicitadas: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-medium text-stone-700 mb-1">Complejidad Artística</label>
              <select
                value={form.nivel_complejidad}
                onChange={(e) => setForm({ ...form, nivel_complejidad: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg"
              >
                <option value="ESTANDAR">Estándar (1.0x)</option>
                <option value="PERSONALIZADO_MEDIO">Personalizado Temático (1.25x)</option>
                <option value="ALTA_ESCULTURAL">Alta Escultural 3D (1.50x)</option>
              </select>
            </div>
            <div>
              <label className="block font-medium text-stone-700 mb-1">Modalidad de Entrega</label>
              <select
                value={form.modalidad_entrega}
                onChange={(e) => setForm({ ...form, modalidad_entrega: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg"
              >
                <option value="DESPACHO_DOMICILIO">Despacho Refrigerado ($5.000)</option>
                <option value="RETIRO_TIENDA">Retiro en Tienda ($0)</option>
              </select>
            </div>
            <div>
              <label className="block font-medium text-stone-700 mb-1">Dedicatoria</label>
              <input
                value={form.dedicatoria_texto}
                onChange={(e) => setForm({ ...form, dedicatoria_texto: e.target.value })}
                placeholder="Ej. ¡Feliz Cumpleaños!"
                className="w-full px-3 py-2 border border-stone-300 rounded-lg"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={simularCotizacion}
              className="inline-flex items-center gap-2 px-4 py-2 bg-stone-800 text-white rounded-lg text-sm font-medium hover:bg-stone-900"
            >
              <Calculator className="w-4 h-4" /> Simular Cotización & Stock BOM
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-semibold hover:bg-rose-700"
            >
              Confirmar y Guardar Pedido (POST)
            </button>
          </div>

          {simulacion && (
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 text-sm space-y-2">
              <div className="flex flex-wrap justify-between gap-2 font-semibold">
                <span>Total Cotizado: ${Number(simulacion.precio_total_cotizado).toLocaleString('es-CL')} CLP</span>
                <span className={simulacion.stock_factible ? 'text-emerald-700' : 'text-red-600'}>
                  {simulacion.stock_factible ? 'Stock BOM Factible' : 'Déficit de Stock en Bodega'}
                </span>
              </div>
              <p className="text-xs text-stone-600">
                Factor escala: {simulacion.factor_escala}x · Costo insumos BOM: ${Number(simulacion.costo_bom_estimado).toLocaleString('es-CL')} · Abono 50%: ${Number(simulacion.abono_minimo_50pct).toLocaleString('es-CL')}
              </p>
            </div>
          )}
        </form>
      )}

      <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-stone-50 text-stone-600 text-xs uppercase">
            <tr>
              <th className="px-4 py-3">Código</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Producto</th>
              <th className="px-4 py-3">Kanban</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {pedidos.map((p) => (
              <tr key={p.id} className="hover:bg-stone-50">
                <td className="px-4 py-3 font-mono font-semibold text-rose-700">{p.codigo_pedido}</td>
                <td className="px-4 py-3">{p.cliente_nombre}</td>
                <td className="px-4 py-3">{p.producto_nombre} ({p.porciones_solicitadas} porc.)</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 text-xs rounded-full bg-stone-100 font-medium">
                    {p.estado_kanban_display}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-semibold">${Number(p.precio_total).toLocaleString('es-CL')}</td>
                <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                  <button
                    onClick={() => verExplosionBom(p)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs border border-stone-300 rounded-md hover:bg-stone-100"
                  >
                    <Eye className="w-3.5 h-3.5" /> BOM
                  </button>
                  <button
                    onClick={() => eliminarPedido(p)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs border border-red-200 text-red-700 rounded-md hover:bg-red-50"
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
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-200 flex items-center justify-between">
              <h3 className="font-bold">Explosión BOM · {explosionModal.codigo_pedido}</h3>
              <button onClick={() => setExplosionModal(null)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-3 text-sm max-h-[75vh] overflow-y-auto">
              <p className="text-stone-600">
                {explosionModal.producto_base} · {explosionModal.porciones_solicitadas} porciones (Factor {explosionModal.factor_escala_porciones}x)
              </p>
              <table className="w-full text-xs border border-stone-200">
                <thead className="bg-stone-50">
                  <tr>
                    <th className="p-2 text-left">Insumo</th>
                    <th className="p-2 text-right">Requerido</th>
                    <th className="p-2 text-right">Stock</th>
                    <th className="p-2 text-center">Factible</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {explosionModal.explosion_materiales.map((item) => (
                    <tr key={item.insumo_id}>
                      <td className="p-2">{item.nombre_insumo}</td>
                      <td className="p-2 text-right">{item.cantidad_requerida} {item.unidad_medida}</td>
                      <td className="p-2 text-right">{item.stock_disponible} {item.unidad_medida}</td>
                      <td className="p-2 text-center">
                        {item.stock_suficiente ? '✅' : '❌'}
                      </td>
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
