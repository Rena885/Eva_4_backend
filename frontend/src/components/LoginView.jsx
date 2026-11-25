import { useState } from 'react'
import {
  Lock,
  User,
  Server,
  ShieldCheck,
  Sparkles,
  Calculator,
  Kanban,
  Package,
  Truck,
} from 'lucide-react'
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
    <div className="da-login-bg min-h-screen flex items-center justify-center p-4 md:p-6">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-xl border border-[#f0e4ee] overflow-hidden grid grid-cols-1 md:grid-cols-12">
        {/* Columna izquierda estilo Eva 3 Dulce Arte */}
        <div className="da-login-aside md:col-span-5 p-7 md:p-8 flex flex-col justify-between gap-6">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-white/75 text-[#5e3a5a] border border-[#ebd4e7]">
              <Sparkles className="w-3.5 h-3.5 text-[#d9739f]" /> Pastelería Artesanal
            </span>
            <div className="mt-4 flex items-center gap-2.5">
              <span className="text-3xl">🎂</span>
              <div>
                <h1 className="text-2xl font-extrabold text-[#462842] leading-tight">Dulce Arte</h1>
                <p className="text-xs font-medium text-[#7f6a7c]">Taller &amp; Gestión Integral</p>
              </div>
            </div>
            <p className="mt-3 text-sm text-[#5e3a5a] leading-relaxed">
              Plataforma operativa conectada en tiempo real para gestionar pedidos personalizados, recetas BOM, cocina y entregas con respaldo digital.
            </p>

            <ul className="mt-5 space-y-2.5 text-xs font-medium text-[#462842]">
              <li className="flex items-center gap-2.5">
                <span className="p-1.5 rounded-lg bg-white/80 text-[#d9739f]"><Calculator className="w-3.5 h-3.5" /></span>
                Cotizador dinámico con escala de porciones (BOM)
              </li>
              <li className="flex items-center gap-2.5">
                <span className="p-1.5 rounded-lg bg-white/80 text-[#d9739f]"><Kanban className="w-3.5 h-3.5" /></span>
                Tablero Kanban de cocina con descuento atómico
              </li>
              <li className="flex items-center gap-2.5">
                <span className="p-1.5 rounded-lg bg-white/80 text-[#d9739f]"><Package className="w-3.5 h-3.5" /></span>
                Control de bodega, mermas, recetas y Kardex
              </li>
              <li className="flex items-center gap-2.5">
                <span className="p-1.5 rounded-lg bg-white/80 text-[#d9739f]"><Truck className="w-3.5 h-3.5" /></span>
                Rutas de despacho y firma digital en pantalla
              </li>
            </ul>
          </div>

          <div className="bg-white/70 rounded-2xl p-3.5 border border-[#ebd4e7] text-xs space-y-1">
            <div className="font-bold text-[#462842] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#d9739f]" /> Despliegue AWS (EVA 4)
            </div>
            <p className="text-[#6d546a]">
              EC2 Frontend + API Gateway + Django DRF + PostgreSQL RDS + Amazon S3 · Argon2id &amp; JWT
            </p>
          </div>
        </div>

        {/* Columna derecha: Formulario de ingreso */}
        <form onSubmit={handleSubmit} className="md:col-span-7 p-7 md:p-9 space-y-4 bg-white flex flex-col justify-center">
          <div>
            <h2 className="text-xl font-extrabold text-[#462842]">Bienvenido al Taller</h2>
            <p className="text-sm text-[#7f6a7c]">
              Inicia sesión para emitir tu token JWT y operar el sistema Dulce Arte.
            </p>
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 text-sm rounded-xl p-3">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-[#5e3a5a] mb-1">Usuario</label>
            <div className="relative">
              <User className="w-4 h-4 text-[#9e7d9a] absolute left-3.5 top-3" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 border border-[#e6d1e3] rounded-xl text-sm bg-[#fdf8fb] focus:bg-white focus:ring-2 focus:ring-[#d9739f] focus:border-[#d9739f] outline-none"
                placeholder="admin"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#5e3a5a] mb-1">Contraseña</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#9e7d9a] absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 border border-[#e6d1e3] rounded-xl text-sm bg-[#fdf8fb] focus:bg-white focus:ring-2 focus:ring-[#d9739f] focus:border-[#d9739f] outline-none"
                placeholder="••••••••••••"
              />
            </div>
            <p className="text-xs text-[#7f6a7c] mt-1">
              Validación JWT contra <code className="bg-[#fdf2f8] text-[#5e3a5a] px-1.5 py-0.5 rounded">/api/v1/auth/token/</code> (Hash Argon2id)
            </p>
          </div>

          <div>
            <span className="block text-xs font-semibold text-[#7f6a7c] mb-1.5">
              Seleccionar perfil de acceso rápido (RBAC):
            </span>
            <div className="flex flex-wrap gap-1.5">
              {DEMO_USERS.map((u) => (
                <button
                  key={u.username}
                  type="button"
                  onClick={() => setUsername(u.username)}
                  className={`text-xs px-3 py-1.5 rounded-full border font-medium transition ${
                    username === u.username
                      ? 'bg-[#d9739f] text-white border-[#d9739f] shadow-sm'
                      : 'bg-[#fdf8fb] text-[#5e3a5a] border-[#e6d1e3] hover:bg-[#fceaf2]'
                  }`}
                >
                  {u.label}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-1 flex items-center gap-1.5 text-xs text-[#7f6a7c] font-mono bg-[#fdf8fb] border border-[#f0e4ee] px-3 py-2 rounded-xl">
            <Server className="w-3.5 h-3.5 shrink-0 text-[#d9739f]" />
            <span className="truncate">API Gateway: {apiUrl}</span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-dulce w-full py-2.5 text-sm cursor-pointer"
          >
            {loading ? 'Autenticando con JWT...' : 'Ingresar al Taller'}
          </button>
        </form>
      </div>
    </div>
  )
}
