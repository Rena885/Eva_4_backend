import { useEffect, useState } from 'react'
import { Plus, Search, Pencil, Trash2, X } from 'lucide-react'
import { apiRequest } from '../services/api'

const INITIAL_FORM = {
  rut: '',
  nombre_completo: '',
  tipo_cliente: 'PARTICULAR',
  email: '',
  telefono: '+56 9 ',
  direccion_habitual: '',
  comuna: 'Providencia',
  preferencias_alimentarias: '',
}

export default function ClientesView() {
  const [clientes, setClientes] = useState([])
  const [search, setSearch] = useState('')
  const [form, setForm] = useState(INITIAL_FORM)
  const [editingId, setEditingId] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [loading, setLoading] = useState(true)

  async function cargarClientes(query = search) {
    setLoading(true)
    try {
      const qs = query ? `?search=${encodeURIComponent(query)}` : ''
      const data = await apiRequest(`/api/v1/clientes/${qs}`)
      setClientes(data.results || data)
    } catch (err) {
      setFeedback({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarClientes('')
  }, [])

  function abrirCrear() {
    setEditingId(null)
    setForm(INITIAL_FORM)
    setShowModal(true)
  }

  function abrirEditar(c) {
    setEditingId(c.id)
    setForm({
      rut: c.rut,
      nombre_completo: c.nombre_completo,
      tipo_cliente: c.tipo_cliente,
      email: c.email,
      telefono: c.telefono,
      direccion_habitual: c.direccion_habitual,
      comuna: c.comuna,
      preferencias_alimentarias: c.preferencias_alimentarias || '',
    })
    setShowModal(true)
  }

  async function guardarCliente(e) {
    e.preventDefault()
    setFeedback(null)
    try {
      if (editingId) {
        const updated = await apiRequest(`/api/v1/clientes/${editingId}/`, {
          method: 'PATCH',
          body: form,
        })
        setFeedback({ type: 'success', text: `PATCH 200 OK · Cliente "${updated.nombre_completo}" actualizado en RDS.` })
      } else {
        const created = await apiRequest('/api/v1/clientes/', {
          method: 'POST',
          body: form,
        })
        setFeedback({ type: 'success', text: `POST 201 Created · Cliente "${created.nombre_completo}" guardado en PostgreSQL.` })
      }
      setShowModal(false)
      cargarClientes()
    } catch (err) {
      setFeedback({ type: 'error', text: `HTTP ${err.status || 400}: ${err.message}` })
    }
  }

  async function eliminarCliente(c) {
    if (!window.confirm(`¿Eliminar a ${c.nombre_completo}?`)) return
    setFeedback(null)
    try {
      await apiRequest(`/api/v1/clientes/${c.id}/`, { method: 'DELETE' })
      setFeedback({ type: 'success', text: `DELETE 204 No Content · Cliente "${c.nombre_completo}" eliminado.` })
      cargarClientes()
    } catch (err) {
      setFeedback({ type: 'error', text: `HTTP ${err.status || 400}: ${err.message}` })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-stone-900">Clientes · CRUD RESTful (JSON + JWT)</h2>
          <p className="text-sm text-stone-500">
            Endpoint <code className="bg-stone-100 px-1.5 py-0.5 rounded">/api/v1/clientes/</code> · Demostración GET, POST, PATCH y DELETE sobre RDS
          </p>
        </div>
        <button
          onClick={abrirCrear}
          className="inline-flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg text-sm font-semibold"
        >
          <Plus className="w-4 h-4" /> Nuevo Cliente
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

      <form
        onSubmit={(e) => {
          e.preventDefault()
          cargarClientes(search)
        }}
        className="flex gap-2"
      >
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, RUT o comuna..."
            className="w-full pl-9 pr-3 py-2 border border-stone-300 rounded-lg text-sm bg-white"
          />
        </div>
        <button type="submit" className="px-4 py-2 bg-stone-800 text-white text-sm rounded-lg hover:bg-stone-900">
          Buscar
        </button>
      </form>

      <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-stone-50 text-stone-600 text-xs uppercase">
            <tr>
              <th className="px-4 py-3">RUT</th>
              <th className="px-4 py-3">Nombre Completo</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Correo / Teléfono</th>
              <th className="px-4 py-3">Dirección</th>
              <th className="px-4 py-3 text-right">Acciones CRUD</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-stone-500">Cargando clientes...</td>
              </tr>
            ) : clientes.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-stone-500">Sin resultados.</td>
              </tr>
            ) : (
              clientes.map((c) => (
                <tr key={c.id} className="hover:bg-stone-50">
                  <td className="px-4 py-3 font-mono text-xs font-semibold">{c.rut}</td>
                  <td className="px-4 py-3 font-medium text-stone-900">{c.nombre_completo}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 text-xs rounded-full bg-rose-50 text-rose-700">
                      {c.tipo_cliente_display}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-stone-600">
                    <div>{c.email}</div>
                    <div>{c.telefono}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-stone-600">
                    {c.direccion_habitual} ({c.comuna})
                  </td>
                  <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                    <button
                      onClick={() => abrirEditar(c)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs border border-stone-300 rounded-md hover:bg-stone-100"
                    >
                      <Pencil className="w-3.5 h-3.5" /> Editar
                    </button>
                    <button
                      onClick={() => eliminarCliente(c)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs border border-red-200 text-red-700 rounded-md hover:bg-red-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Eliminar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-200 flex items-center justify-between">
              <h3 className="font-bold text-stone-900">{editingId ? 'Editar Cliente (PATCH)' : 'Nuevo Cliente (POST)'}</h3>
              <button onClick={() => setShowModal(false)} className="text-stone-400 hover:text-stone-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={guardarCliente} className="p-5 space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-stone-700 mb-1">RUT *</label>
                  <input
                    required
                    value={form.rut}
                    onChange={(e) => setForm({ ...form, rut: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg"
                    placeholder="18.456.789-K"
                  />
                </div>
                <div>
                  <label className="block font-medium text-stone-700 mb-1">Tipo</label>
                  <select
                    value={form.tipo_cliente}
                    onChange={(e) => setForm({ ...form, tipo_cliente: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg"
                  >
                    <option value="PARTICULAR">Cliente Particular</option>
                    <option value="EVENTO_NOVIOS">Matrimonio / Banquetería</option>
                    <option value="CORPORATIVO">Empresa / Corporativo</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-medium text-stone-700 mb-1">Nombre Completo *</label>
                <input
                  required
                  value={form.nombre_completo}
                  onChange={(e) => setForm({ ...form, nombre_completo: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-stone-700 mb-1">Email *</label>
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-medium text-stone-700 mb-1">Teléfono *</label>
                  <input
                    required
                    value={form.telefono}
                    onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-stone-700 mb-1">Dirección *</label>
                  <input
                    required
                    value={form.direccion_habitual}
                    onChange={(e) => setForm({ ...form, direccion_habitual: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-medium text-stone-700 mb-1">Comuna *</label>
                  <input
                    required
                    value={form.comuna}
                    onChange={(e) => setForm({ ...form, comuna: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block font-medium text-stone-700 mb-1">Restricciones / Alergias</label>
                <input
                  value={form.preferencias_alimentarias}
                  onChange={(e) => setForm({ ...form, preferencias_alimentarias: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg"
                  placeholder="Sin gluten, sin trazas de maní..."
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-stone-300 rounded-lg">
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-2 bg-rose-600 text-white font-semibold rounded-lg hover:bg-rose-700">
                  Guardar en API
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
