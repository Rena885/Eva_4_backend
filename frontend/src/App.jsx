import { useState } from 'react'
import { LayoutDashboard, Users, ShoppingBag, Kanban, Package, Truck, ShieldCheck, LogOut } from 'lucide-react'
import { clearSession, getApiBaseUrl, getStoredSession } from './services/api'
import LoginView from './components/LoginView'
import DashboardView from './components/DashboardView'
import ClientesView from './components/ClientesView'
import PedidosView from './components/PedidosView'
import KanbanView from './components/KanbanView'
import BodegaView from './components/BodegaView'
import DespachoView from './components/DespachoView'
import SeguridadApiView from './components/SeguridadApiView'

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'clientes', label: 'Clientes CRUD', icon: Users },
  { id: 'pedidos', label: 'Pedidos & BOM', icon: ShoppingBag },
  { id: 'kanban', label: 'Kanban Cocina', icon: Kanban },
  { id: 'bodega', label: 'Bodega', icon: Package },
  { id: 'despacho', label: 'Despacho', icon: Truck },
  { id: 'seguridad', label: 'JWT & Rate Limit', icon: ShieldCheck },
]

export default function App() {
  const [session, setSession] = useState(() => getStoredSession())
  const [activeTab, setActiveTab] = useState('dashboard')

  if (!session?.access) {
    return <LoginView onSuccess={(data) => setSession(data)} />
  }

  function handleLogout() {
    clearSession()
    setSession({ access: null, refresh: null, user: null })
  }

  const usuario = session.user || session.usuario || {}

  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      <header className="bg-stone-900 text-white border-b border-stone-800 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎂</span>
            <div>
              <h1 className="font-bold text-base leading-tight">Dulce Arte · Frontend AWS</h1>
              <p className="text-[11px] text-stone-400 font-mono">API: {getApiBaseUrl()}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right text-xs">
              <div className="font-semibold text-stone-100">{usuario.nombre_completo || usuario.username || 'Usuario JWT'}</div>
              <div className="text-rose-300 font-mono">Rol: {usuario.rol || 'AUTENTICADO'}</div>
            </div>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-stone-800 hover:bg-stone-700 rounded-lg border border-stone-700"
            >
              <LogOut className="w-3.5 h-3.5" /> Salir
            </button>
          </div>
        </div>

        <nav className="max-w-7xl mx-auto px-4 flex gap-1 overflow-x-auto pb-2">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                  active ? 'bg-rose-600 text-white' : 'text-stone-300 hover:bg-stone-800 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        {activeTab === 'dashboard' && <DashboardView />}
        {activeTab === 'clientes' && <ClientesView />}
        {activeTab === 'pedidos' && <PedidosView />}
        {activeTab === 'kanban' && <KanbanView />}
        {activeTab === 'bodega' && <BodegaView />}
        {activeTab === 'despacho' && <DespachoView />}
        {activeTab === 'seguridad' && <SeguridadApiView />}
      </main>
    </div>
  )
}
