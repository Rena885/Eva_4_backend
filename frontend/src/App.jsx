import { useState } from 'react'
import {
  LayoutDashboard,
  Users,
  ShoppingBag,
  Kanban,
  Package,
  Truck,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  ExternalLink,
  Database,
} from 'lucide-react'
import { clearSession, getApiBaseUrl, getStoredSession } from './services/api'
import LoginView from './components/LoginView'
import DashboardView from './components/DashboardView'
import ClientesView from './components/ClientesView'
import PedidosView from './components/PedidosView'
import KanbanView from './components/KanbanView'
import BodegaView from './components/BodegaView'
import DespachoView from './components/DespachoView'
import SeguridadApiView from './components/SeguridadApiView'

const NAV_GROUPS = [
  {
    heading: 'Flujo de trabajo',
    items: [
      { id: 'dashboard', label: 'Inicio', icon: LayoutDashboard },
      { id: 'pedidos', label: 'Cotizaciones y pedidos', icon: ShoppingBag },
      { id: 'kanban', label: 'Cocina (Kanban)', icon: Kanban },
      { id: 'bodega', label: 'Bodega y recetas', icon: Package },
      { id: 'despacho', label: 'Despacho y firma', icon: Truck },
    ],
  },
  {
    heading: 'Clientes',
    items: [{ id: 'clientes', label: 'Directorio de clientes', icon: Users }],
  },
  {
    heading: 'Seguridad & AWS (EVA 4)',
    items: [{ id: 'seguridad', label: 'JWT & Rate Limit', icon: ShieldCheck }],
  },
]

const TAB_TITLES = {
  dashboard: 'Panel Operativo · Dulce Arte',
  pedidos: 'Cotizaciones y Pedidos Personalizados',
  kanban: 'Tablero Kanban Taller de Cocina',
  bodega: 'Bodega de Insumos y Recetas BOM',
  despacho: 'Rutas de Despacho y Firma Digital',
  clientes: 'Directorio y CRUD de Clientes',
  seguridad: 'Seguridad JWT, Argon2 & Rate Limit',
}

export default function App() {
  const [session, setSession] = useState(() => getStoredSession())
  const [activeTab, setActiveTab] = useState('dashboard')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  if (!session?.access) {
    return <LoginView onSuccess={(data) => setSession(data)} />
  }

  function handleLogout() {
    clearSession()
    setSession({ access: null, refresh: null, user: null })
  }

  function selectTab(tabId) {
    setActiveTab(tabId)
    setMobileMenuOpen(false)
  }

  const usuario = session.user || session.usuario || {}
  const displayName = usuario.nombre_completo || usuario.username || 'Usuario JWT'
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('') || 'DA'
  const apiBase = getApiBaseUrl()

  return (
    <div className="min-h-screen flex bg-[#fdf8fb]">
      {/* Backdrop móvil */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-[#462842]/35 z-30 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar pastel estilo Eva 3 Dulce Arte */}
      <aside
        className={`da-sidebar fixed lg:sticky top-0 left-0 h-screen w-[270px] shrink-0 z-40 flex flex-col justify-between p-4 transition-transform duration-200 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="space-y-5 overflow-y-auto pr-1">
          {/* Marca */}
          <div className="flex items-center justify-between px-2 pt-1">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">🎂</span>
              <div>
                <h1 className="font-extrabold text-lg text-[#462842] leading-none">Dulce Arte</h1>
                <p className="text-[11px] font-medium text-[#7f6a7c] mt-0.5">Pastelería Artesanal</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden p-1.5 rounded-lg text-[#5e3a5a] hover:bg-white/60"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Grupos de navegación Eva 3 */}
          <nav className="space-y-4">
            {NAV_GROUPS.map((group) => (
              <div key={group.heading} className="space-y-1">
                <div className="da-sidebar-heading px-2.5 pb-1">{group.heading}</div>
                {group.items.map((item) => {
                  const Icon = item.icon
                  const isActive = activeTab === item.id
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => selectTab(item.id)}
                      className={`da-sidebar-link cursor-pointer ${isActive ? 'active' : ''}`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  )
                })}
              </div>
            ))}

            <div className="pt-1 border-t border-[#ebd4e7]">
              <a
                href={`${apiBase}/api/v1/docs/`}
                target="_blank"
                rel="noreferrer"
                className="da-sidebar-link"
              >
                <ExternalLink className="w-4 h-4 shrink-0" />
                <span>API Docs (Swagger)</span>
              </a>
            </div>
          </nav>
        </div>

        {/* Footer del sidebar */}
        <div className="bg-white/65 border border-[#ebd4e7] rounded-2xl p-3 text-xs space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-[#462842]">
            <Database className="w-3.5 h-3.5 text-[#d9739f]" /> PostgreSQL RDS + S3
          </div>
          <p className="text-[11px] text-[#7f6a7c] truncate font-mono">{apiBase}</p>
        </div>
      </aside>

      {/* Contenedor principal */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="da-topbar sticky top-0 z-20 px-4 md:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl border border-[#e6d1e3] bg-white text-[#5e3a5a]"
              aria-label="Abrir menú"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <div className="font-bold text-sm md:text-base text-[#462842] truncate">
                {TAB_TITLES[activeTab] || 'Dulce Arte'}
              </div>
              <div className="text-[11px] text-[#7f6a7c] hidden sm:block">
                Arquitectura Desacoplada EVA 4 · JWT + API Gateway + RDS + S3
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="da-avatar">{initials}</div>
              <div className="hidden sm:block text-right leading-tight">
                <div className="text-xs font-bold text-[#462842]">{displayName}</div>
                <div className="text-[11px] font-semibold text-[#d9739f]">
                  {usuario.rol_display || usuario.rol || 'AUTENTICADO'}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="btn-dulce-outline inline-flex items-center gap-1.5 px-3 py-1.5 text-xs cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </header>

        <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-6 py-6">
          {activeTab === 'dashboard' && <DashboardView usuario={usuario} onNavigate={selectTab} />}
          {activeTab === 'clientes' && <ClientesView />}
          {activeTab === 'pedidos' && <PedidosView />}
          {activeTab === 'kanban' && <KanbanView />}
          {activeTab === 'bodega' && <BodegaView />}
          {activeTab === 'despacho' && <DespachoView />}
          {activeTab === 'seguridad' && <SeguridadApiView />}
        </main>

        <footer className="da-footer px-6 py-4 text-center text-xs">
          Dulce Arte · Sistema Integral de Pastelería Personalizada · Frontend EC2 + API Gateway + Backend DRF + RDS + S3
        </footer>
      </div>
    </div>
  )
}
