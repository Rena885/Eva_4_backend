import { useState } from 'react'
import { Lock, User, Server, ShieldCheck } from 'lucide-react'
import { getApiBaseUrl, loginWithJwt } from '../services/api'

const DEMO_USERS = [
  { username: 'admin', label: 'Admin General' },
  { username: 'ventas_camila', label: 'Ventas' },
  { username: 'chef_matias', label: 'Cocina Kanban' },
  { username: 'bodega_pedro', label: 'Bodega BOM' },
  { username: 'repartidor_lucas', label: 'Repartidor' },
]

export default function LoginView({ onSuccess }) {
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const apiUrl = getApiBaseUrl()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const session = await loginWithJwt(username.trim(), password)
      onSuccess(session)
    } catch (err) {
      setError(err.message || 'No se pudo autenticar con JWT.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-stone-50 to-amber-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-stone-200 overflow-hidden">
        <div className="bg-stone-900 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-rose-300">
                <ShieldCheck className="w-4 h-4" /> EVA 4 · Arquitectura AWS + JWT
              </span>
              <h1 className="text-2xl font-bold mt-1">Dulce Arte</h1>
              <p className="text-stone-300 text-sm">Frontend SPA desacoplado (EC2 Frontend)</p>
            </div>
            <div className="text-3xl">🎂</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Usuario</label>
            <div className="relative">
              <User className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none"
                placeholder="admin"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Contraseña</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none"
                placeholder="••••••••••••"
              />
            </div>
            <p className="text-xs text-stone-500 mt-1">
              Autenticación contra <code className="bg-stone-100 px-1 rounded">POST /api/v1/auth/token/</code> (Hash Argon2id)
            </p>
          </div>

          <div>
            <span className="block text-xs font-medium text-stone-500 mb-1.5">
              Rellenar usuario de prueba por rol RBAC:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {DEMO_USERS.map((u) => (
                <button
                  key={u.username}
                  type="button"
                  onClick={() => setUsername(u.username)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition ${
                    username === u.username
                      ? 'bg-rose-600 text-white border-rose-600'
                      : 'bg-stone-100 text-stone-700 border-stone-200 hover:bg-stone-200'
                  }`}
                >
                  {u.label}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-1 flex items-center gap-1.5 text-xs text-stone-500 font-mono">
            <Server className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">API: {apiUrl}</span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition text-sm"
          >
            {loading ? 'Generando Token JWT...' : 'Iniciar Sesión con JWT'}
          </button>
        </form>
      </div>
    </div>
  )
}
