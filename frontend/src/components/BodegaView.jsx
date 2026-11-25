import { useEffect, useState } from 'react'
import { PackagePlus, AlertTriangle } from 'lucide-react'
import { apiRequest } from '../services/api'

export default function BodegaView() {
  const [insumos, setInsumos] = useState([])
  const [feedback, setFeedback] = useState(null)

  async function cargar() {
    try {
      const data = await apiRequest('/api/v1/insumos/')
      setInsumos(data.results || data)
    } catch (err) {
      setFeedback({ type: 'error', text: err.message })
    }
  }

  useEffect(() => {
    cargar()
  }, [])

  async function ajustarStock(insumo, tipo) {
    const cantidad = window.prompt(
      `${tipo === 'ENTRADA_COMPRA' ? 'Ingreso' : 'Merma'} para ${insumo.nombre} (${insumo.unidad_medida}):`,
      '5'
    )
    if (!cantidad) return
    setFeedback(null)
    try {
      const resp = await apiRequest(`/api/v1/insumos/${insumo.id}/ajustar_stock/`, {
        method: 'POST',
        body: { tipo_movimiento: tipo, cantidad, motivo: 'Ajuste desde SPA Frontend' },
      })
      setFeedback({ type: 'success', text: resp.mensaje })
      cargar()
    } catch (err) {
      setFeedback({ type: 'error', text: `HTTP ${err.status || 400}: ${err.message}` })
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-stone-900">Bodega e Inventario BOM</h2>
        <p className="text-sm text-stone-500">
          Endpoint <code className="bg-stone-100 px-1.5 py-0.5 rounded">/api/v1/insumos/</code> · Control de stock crítico y Kardex
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

      <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-stone-50 text-stone-600 text-xs uppercase">
            <tr>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">Insumo</th>
              <th className="px-4 py-3">Categoría</th>
              <th className="px-4 py-3 text-right">Stock Actual</th>
              <th className="px-4 py-3 text-right">Mínimo</th>
              <th className="px-4 py-3 text-right">Ajuste Rápido</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {insumos.map((ins) => (
              <tr key={ins.id} className="hover:bg-stone-50">
                <td className="px-4 py-3 font-mono text-xs">{ins.codigo_sku}</td>
                <td className="px-4 py-3 font-medium">
                  <div className="flex items-center gap-2">
                    {ins.nombre}
                    {ins.en_alerta_stock && (
                      <span className="inline-flex items-center gap-1 text-[11px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                        <AlertTriangle className="w-3 h-3" /> Crítico
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-stone-600">{ins.categoria_nombre}</td>
                <td className="px-4 py-3 text-right font-semibold">
                  {ins.stock_actual} {ins.unidad_medida}
                </td>
                <td className="px-4 py-3 text-right text-stone-500">
                  {ins.stock_minimo} {ins.unidad_medida}
                </td>
                <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                  <button
                    onClick={() => ajustarStock(ins, 'ENTRADA_COMPRA')}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md hover:bg-emerald-100"
                  >
                    <PackagePlus className="w-3.5 h-3.5" /> + Compra
                  </button>
                  <button
                    onClick={() => ajustarStock(ins, 'AJUSTE_MERMA')}
                    className="px-2.5 py-1 text-xs border border-stone-300 rounded-md hover:bg-stone-100"
                  >
                    - Merma
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
