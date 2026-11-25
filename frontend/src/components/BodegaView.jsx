import { useEffect, useState } from 'react'
import { PackagePlus, AlertTriangle, Plus, BookOpen, History, Package } from 'lucide-react'
import { apiRequest } from '../services/api'

const UNIDADES = [
  { value: 'KG', label: 'Kilogramos (kg)' },
  { value: 'GR', label: 'Gramos (g)' },
  { value: 'LT', label: 'Litros (L)' },
  { value: 'ML', label: 'Mililitros (ml)' },
  { value: 'UNIDAD', label: 'Unidades (un)' },
]

export default function BodegaView() {
  const [subTab, setSubTab] = useState('insumos')
  const [insumos, setInsumos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [productos, setProductos] = useState([])
  const [movimientos, setMovimientos] = useState([])
  const [showNewForm, setShowNewForm] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [form, setForm] = useState({
    nombre: '',
    categoria: '',
    unidad_medida: 'KG',
    stock_actual: '10',
    stock_minimo: '3',
    costo_unitario: '2500',
    ubicacion_bodega: 'Estante Secos A1',
  })

  async function cargar() {
    try {
      const [insData, catData, prodData, movData] = await Promise.all([
        apiRequest('/api/v1/insumos/'),
        apiRequest('/api/v1/categorias-insumo/'),
        apiRequest('/api/v1/productos/'),
        apiRequest('/api/v1/movimientos-inventario/'),
      ])
      const cats = catData.results || catData
      setInsumos(insData.results || insData)
      setCategorias(cats)
      setProductos(prodData.results || prodData)
      setMovimientos(movData.results || movData)
      setForm((prev) => ({
        ...prev,
        categoria: prev.categoria || cats[0]?.id || '',
      }))
    } catch (err) {
      setFeedback({ type: 'error', text: err.message })
    }
  }

  useEffect(() => {
    cargar()
  }, [])

  async function crearInsumo(e) {
    e.preventDefault()
    setFeedback(null)
    try {
      const created = await apiRequest('/api/v1/insumos/', {
        method: 'POST',
        body: {
          nombre: form.nombre.trim(),
          categoria: Number(form.categoria),
          unidad_medida: form.unidad_medida,
          stock_actual: form.stock_actual,
          stock_minimo: form.stock_minimo,
          costo_unitario: form.costo_unitario,
          ubicacion_bodega: form.ubicacion_bodega,
        },
      })
      setFeedback({ type: 'success', text: `POST 201 Created · Insumo "${created.nombre}" registrado en bodega RDS.` })
      setShowNewForm(false)
      setForm((prev) => ({ ...prev, nombre: '' }))
      cargar()
    } catch (err) {
      setFeedback({ type: 'error', text: `HTTP ${err.status || 400}: ${err.message}` })
    }
  }

  async function ajustarStock(insumo, tipo) {
    const cantidad = window.prompt(
      `${tipo === 'ENTRADA_COMPRA' ? 'Ingreso por compra' : 'Baja por merma'} para ${insumo.nombre} (${insumo.unidad_medida}):`,
      '5'
    )
    if (!cantidad) return
    setFeedback(null)
    try {
      const resp = await apiRequest(`/api/v1/insumos/${insumo.id}/ajustar_stock/`, {
        method: 'POST',
        body: { tipo_movimiento: tipo, cantidad, motivo: 'Ajuste rápido desde SPA Dulce Arte' },
      })
      setFeedback({ type: 'success', text: resp.mensaje })
      cargar()
    } catch (err) {
      setFeedback({ type: 'error', text: `HTTP ${err.status || 400}: ${err.message}` })
    }
  }

  const valorTotalBodega = insumos.reduce(
    (acc, ins) => acc + Number(ins.valor_inventario_total || Number(ins.stock_actual) * Number(ins.costo_unitario)),
    0
  )

  return (
    <div className="space-y-4">
      <div className="da-card p-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-[#462842]">Bodega de Insumos, Recetas BOM y Kardex</h2>
          <p className="text-xs md:text-sm text-[#7f6a7c] mt-0.5">
            Control de materias primas, recetas estandarizadas por porción y trazabilidad de inventario.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-[#fdf2f8] border border-[#ebd4e7] text-xs font-extrabold text-[#462842]">
            Valorización: ${Math.round(valorTotalBodega).toLocaleString('es-CL')} CLP
          </span>
          {subTab === 'insumos' && (
            <button
              type="button"
              onClick={() => setShowNewForm((v) => !v)}
              className="btn-dulce inline-flex items-center gap-1.5 px-3.5 py-2 text-xs md:text-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" /> {showNewForm ? 'Cerrar Formulario' : 'Nuevo Insumo'}
            </button>
          )}
        </div>
      </div>

      {/* Pestañas estilo Eva 3 inventario_bom.html */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setSubTab('insumos')}
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs md:text-sm font-bold cursor-pointer transition ${
            subTab === 'insumos' ? 'btn-dulce' : 'btn-dulce-outline'
          }`}
        >
          <Package className="w-4 h-4" /> 1. Insumos en Bodega ({insumos.length})
        </button>
        <button
          type="button"
          onClick={() => setSubTab('recetas')}
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs md:text-sm font-bold cursor-pointer transition ${
            subTab === 'recetas' ? 'btn-dulce' : 'btn-dulce-outline'
          }`}
        >
          <BookOpen className="w-4 h-4" /> 2. Recetas &amp; Productos BOM ({productos.length})
        </button>
        <button
          type="button"
          onClick={() => setSubTab('kardex')}
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs md:text-sm font-bold cursor-pointer transition ${
            subTab === 'kardex' ? 'btn-dulce' : 'btn-dulce-outline'
          }`}
        >
          <History className="w-4 h-4" /> 3. Kardex Movimientos ({movimientos.length})
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

      {subTab === 'insumos' && (
        <>
          {showNewForm && (
            <form onSubmit={crearInsumo} className="da-card p-5 space-y-4">
              <h3 className="font-extrabold text-[#462842] border-b border-[#f0e4ee] pb-2">
                Registrar Nuevo Insumo en Bodega
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                <div>
                  <label className="block font-semibold text-[#5e3a5a] mb-1">Nombre *</label>
                  <input
                    required
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    placeholder="Ej: Chocolate 70% Cacao"
                    className="w-full px-3 py-2 border border-[#e6d1e3] rounded-xl bg-[#fdf8fb]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#5e3a5a] mb-1">Categoría *</label>
                  <select
                    required
                    value={form.categoria}
                    onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                    className="w-full px-3 py-2 border border-[#e6d1e3] rounded-xl bg-[#fdf8fb]"
                  >
                    {categorias.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-[#5e3a5a] mb-1">Unidad de Medida</label>
                  <select
                    value={form.unidad_medida}
                    onChange={(e) => setForm({ ...form, unidad_medida: e.target.value })}
                    className="w-full px-3 py-2 border border-[#e6d1e3] rounded-xl bg-[#fdf8fb]"
                  >
                    {UNIDADES.map((u) => (
                      <option key={u.value} value={u.value}>{u.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-[#5e3a5a] mb-1">Stock Inicial</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={form.stock_actual}
                    onChange={(e) => setForm({ ...form, stock_actual: e.target.value })}
                    className="w-full px-3 py-2 border border-[#e6d1e3] rounded-xl bg-[#fdf8fb]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#5e3a5a] mb-1">Stock Mínimo Alerta</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={form.stock_minimo}
                    onChange={(e) => setForm({ ...form, stock_minimo: e.target.value })}
                    className="w-full px-3 py-2 border border-[#e6d1e3] rounded-xl bg-[#fdf8fb]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#5e3a5a] mb-1">Costo Unitario ($ CLP)</label>
                  <input
                    type="number"
                    min="0"
                    value={form.costo_unitario}
                    onChange={(e) => setForm({ ...form, costo_unitario: e.target.value })}
                    className="w-full px-3 py-2 border border-[#e6d1e3] rounded-xl bg-[#fdf8fb]"
                  />
                </div>
              </div>
              <button type="submit" className="btn-dulce px-5 py-2 text-sm cursor-pointer">
                Guardar Insumo (POST)
              </button>
            </form>
          )}

          <div className="da-card overflow-x-auto">
            <table className="da-table w-full text-sm text-left">
              <thead className="text-[11px] uppercase font-bold">
                <tr>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Insumo</th>
                  <th className="px-4 py-3">Categoría</th>
                  <th className="px-4 py-3 text-right">Stock Actual</th>
                  <th className="px-4 py-3 text-right">Mínimo</th>
                  <th className="px-4 py-3 text-right">Ajuste Rápido Kardex</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f6edf4]">
                {insumos.map((ins) => (
                  <tr key={ins.id} className="hover:bg-[#fdf8fb]">
                    <td className="px-4 py-3 font-mono text-xs font-bold text-[#c55d8b]">{ins.codigo_sku}</td>
                    <td className="px-4 py-3 font-semibold text-[#462842]">
                      <div className="flex flex-wrap items-center gap-2">
                        <span>{ins.nombre}</span>
                        {ins.en_alerta_stock && (
                          <span className="inline-flex items-center gap-1 text-[11px] bg-[#fff1ea] text-[#c9522d] border border-[#fbd8c9] px-2 py-0.5 rounded-full font-bold">
                            <AlertTriangle className="w-3 h-3" /> Crítico
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-[#7f6a7c]">{ins.categoria_nombre}</td>
                    <td className="px-4 py-3 text-right font-extrabold text-[#462842]">
                      {ins.stock_actual} {ins.unidad_medida}
                    </td>
                    <td className="px-4 py-3 text-right text-[#7f6a7c]">
                      {ins.stock_minimo} {ins.unidad_medida}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => ajustarStock(ins, 'ENTRADA_COMPRA')}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-[#eefbf4] text-emerald-800 border border-[#bfe8d1] rounded-lg hover:bg-emerald-100 cursor-pointer font-semibold"
                      >
                        <PackagePlus className="w-3.5 h-3.5" /> + Compra
                      </button>
                      <button
                        type="button"
                        onClick={() => ajustarStock(ins, 'AJUSTE_MERMA')}
                        className="btn-dulce-outline px-2.5 py-1 text-xs cursor-pointer"
                      >
                        - Merma
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {subTab === 'recetas' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {productos.map((prod) => (
            <div key={prod.id} className="da-card p-5 space-y-3">
              <div className="flex items-start justify-between gap-2 border-b border-[#f0e4ee] pb-3">
                <div>
                  <span className="font-mono text-[11px] font-bold text-[#c55d8b]">{prod.codigo}</span>
                  <h3 className="font-extrabold text-[#462842] text-base">{prod.nombre}</h3>
                  <p className="text-xs text-[#7f6a7c]">
                    {prod.categoria_display} · Base {prod.porciones_base} porciones
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-extrabold text-[#462842]">
                    ${Number(prod.precio_base || 0).toLocaleString('es-CL')}
                  </div>
                  <div className="text-[11px] text-emerald-700 font-semibold">
                    Margen {prod.margen_bruto_pct}%
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="text-[11px] font-bold uppercase tracking-wide text-[#7f6a7c]">
                  Lista de Materiales (BOM)
                </div>
                {(prod.items_bom || []).length === 0 ? (
                  <p className="text-xs text-[#9c8499]">Sin ingredientes BOM asociados aún.</p>
                ) : (
                  <div className="space-y-1">
                    {prod.items_bom.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between text-xs bg-[#fdf8fb] border border-[#f0e4ee] rounded-xl px-3 py-1.5"
                      >
                        <span className="font-medium text-[#462842]">{item.insumo_nombre}</span>
                        <span className="font-mono text-[#5e3a5a]">
                          {item.cantidad_con_merma} {item.unidad_medida}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {subTab === 'kardex' && (
        <div className="da-card overflow-x-auto">
          <table className="da-table w-full text-sm text-left">
            <thead className="text-[11px] uppercase font-bold">
              <tr>
                <th className="px-4 py-3">Insumo</th>
                <th className="px-4 py-3">Tipo Movimiento</th>
                <th className="px-4 py-3 text-right">Cantidad</th>
                <th className="px-4 py-3 text-right">Anterior → Nuevo</th>
                <th className="px-4 py-3">Pedido / Motivo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f6edf4]">
              {movimientos.map((m) => (
                <tr key={m.id} className="hover:bg-[#fdf8fb]">
                  <td className="px-4 py-3 font-bold text-[#462842]">
                    {m.insumo_nombre}
                    <div className="text-[11px] font-mono text-[#8f6f8b]">{m.insumo_sku}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#fdf2f8] text-[#5e3a5a] border border-[#f0d8ea]">
                      {m.tipo_movimiento_display}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-[#c55d8b]">
                    {m.cantidad} {m.unidad_medida}
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-[#6d546a] font-mono">
                    {m.stock_anterior} → {m.stock_resultante}
                  </td>
                  <td className="px-4 py-3 text-xs text-[#6d546a]">
                    {m.pedido_codigo && <span className="font-bold text-[#462842] mr-1">[{m.pedido_codigo}]</span>}
                    {m.motivo}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
