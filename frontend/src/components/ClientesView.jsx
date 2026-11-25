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
      <div className="da-card p-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-[#462842]">Directorio de Clientes y Preferencias Alimentarias</h2>
          <p className="text-xs md:text-sm text-[#7f6a7c] mt-0.5">
            Administración CRUD completa (GET, POST, PATCH y DELETE) vía API RESTful en PostgreSQL RDS.
          </p>
        </div>
        <button
          type="button"
          onClick={abrirCrear}
          className="btn-dulce inline-flex items-center gap-2 px-4 py-2 text-xs md:text-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Nuevo Cliente
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

      <form
        onSubmit={(e) => {
          e.preventDefault()
          cargarClientes(search)
        }}
        className="flex flex-wrap gap-2"
      >
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="w-4 h-4 text-[#9e7d9a] absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, RUT o comuna..."
            className="w-full pl-10 pr-3.5 py-2 border border-[#e6d1e3] rounded-xl text-sm bg-white focus:ring-2 focus:ring-[#d9739f] outline-none"
          />
        </div>
        <button type="submit" className="btn-dulce-outline px-4 py-2 text-sm cursor-pointer">
          Buscar
        </button>
      </form>

      <div className="da-card overflow-x-auto">
        <table className="da-table w-full text-sm text-left">
          <thead className="text-[11px] uppercase font-bold">
            <tr>
              <th className="px-4 py-3">RUT</th>
              <th className="px-4 py-3">Nombre Completo</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Contacto</th>
              <th className="px-4 py-3">Dirección / Alergias</th>
              <th className="px-4 py-3 text-right">Acciones CRUD</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f6edf4]">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-[#7f6a7c]">Cargando clientes...</td>
              </tr>
            ) : clientes.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-[#7f6a7c]">Sin resultados.</td>
              </tr>
            ) : (
              clientes.map((c) => (
                <tr key={c.id} className="hover:bg-[#fdf8fb]">
                  <td className="px-4 py-3 font-mono text-xs font-bold text-[#5e3a5a]">{c.rut}</td>
                  <td className="px-4 py-3 font-bold text-[#462842]">{c.nombre_completo}</td>
                  <td className="px-4 py-3">
                    <span className="px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-[#fdf2f8] text-[#c55d8b] border border-[#f2d6e7]">
                      {c.tipo_cliente_display}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#6d546a]">
                    <div>{c.email}</div>
                    <div>{c.telefono}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#6d546a] space-y-1">
                    <div>{c.direccion_habitual} ({c.comuna})</div>
                    {c.preferencias_alimentarias && (
                      <span className="inline-block px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-semibold">
                        ⚠️ {c.preferencias_alimentarias}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => abrirEditar(c)}
                      className="btn-dulce-outline inline-flex items-center gap-1 px-2.5 py-1 text-xs cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" /> Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => eliminarCliente(c)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs border border-rose-200 text-rose-700 rounded-lg hover:bg-rose-50 cursor-pointer"
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
        <div className="fixed inset-0 bg-[#462842]/45 backdrop-blur-[2px] flex items-center justify-center p-4 z-50">
          <div className="da-card max-w-lg w-full overflow-hidden shadow-2xl">
            <div className="px-5 py-4 bg-gradient-to-r from-[#fde4ee] to-[#f1e1f8] border-b border-[#ebd4e7] flex items-center justify-between">
              <h3 className="font-extrabold text-[#462842]">
                {editingId ? 'Editar Cliente (PATCH)' : 'Registrar Nuevo Cliente (POST)'}
              </h3>
              <button type="button" onClick={() => setShowModal(false)} className="text-[#5e3a5a] hover:text-[#462842] cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={guardarCliente} className="p-5 space-y-3 text-sm bg-white">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#5e3a5a] mb-1">RUT *</label>
                  <input
                    required
                    value={form.rut}
                    onChange={(e) => setForm({ ...form, rut: e.target.value })}
                    className="w-full px-3 py-2 border border-[#e6d1e3] rounded-xl bg-[#fdf8fb]"
                    placeholder="18.456.789-K"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#5e3a5a] mb-1">Tipo</label>
                  <select
                    value={form.tipo_cliente}
                    onChange={(e) => setForm({ ...form, tipo_cliente: e.target.value })}
                    className="w-full px-3 py-2 border border-[#e6d1e3] rounded-xl bg-[#fdf8fb]"
                  >
                    <option value="PARTICULAR">Cliente Particular</option>
                    <option value="EVENTO_NOVIOS">Matrimonio / Banquetería</option>
                    <option value="CORPORATIVO">Empresa / Corporativo</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-semibold text-[#5e3a5a] mb-1">Nombre Completo *</label>
                <input
                  required
                  value={form.nombre_completo}
                  onChange={(e) => setForm({ ...form, nombre_completo: e.target.value })}
                  className="w-full px-3 py-2 border border-[#e6d1e3] rounded-xl bg-[#fdf8fb]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#5e3a5a] mb-1">Email *</label>
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-2 border border-[#e6d1e3] rounded-xl bg-[#fdf8fb]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#5e3a5a] mb-1">Teléfono *</label>
                  <input
                    required
                    value={form.telefono}
                    onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                    className="w-full px-3 py-2 border border-[#e6d1e3] rounded-xl bg-[#fdf8fb]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#5e3a5a] mb-1">Dirección *</label>
                  <input
                    required
                    value={form.direccion_habitual}
                    onChange={(e) => setForm({ ...form, direccion_habitual: e.target.value })}
                    className="w-full px-3 py-2 border border-[#e6d1e3] rounded-xl bg-[#fdf8fb]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#5e3a5a] mb-1">Comuna *</label>
                  <input
                    required
                    value={form.comuna}
                    onChange={(e) => setForm({ ...form, comuna: e.target.value })}
                    className="w-full px-3 py-2 border border-[#e6d1e3] rounded-xl bg-[#fdf8fb]"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-[#5e3a5a] mb-1">Restricciones / Alergias</label>
                <input
                  value={form.preferencias_alimentarias}
                  onChange={(e) => setForm({ ...form, preferencias_alimentarias: e.target.value })}
                  className="w-full px-3 py-2 border border-[#e6d1e3] rounded-xl bg-[#fdf8fb]"
                  placeholder="Sin gluten, sin trazas de maní..."
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-dulce-outline px-4 py-2 cursor-pointer">
                  Cancelar
                </button>
                <button type="submit" className="btn-dulce px-4 py-2 cursor-pointer">
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
