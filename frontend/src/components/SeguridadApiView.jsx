import { useEffect, useState } from 'react'
import { KeyRound, ShieldAlert, Zap, ExternalLink } from 'lucide-react'
import { apiRequest, decodeJwtPayload, fetchHealthRaw, getApiBaseUrl, getStoredSession } from '../services/api'

export default function SeguridadApiView() {
  const [meInfo, setMeInfo] = useState(null)
  const [rateResults, setRateResults] = useState([])
  const [testingRate, setTestingRate] = useState(false)
  const { access } = getStoredSession()
  const jwtPayload = decodeJwtPayload(access)
  const apiBase = getApiBaseUrl()

  useEffect(() => {
    apiRequest('/api/v1/auth/me/').then(setMeInfo).catch(() => {})
  }, [])

  async function probarRateLimit() {
    setTestingRate(true)
    setRateResults([])
    const llamadas = Array.from({ length: 12 }, (_, idx) =>
      fetchHealthRaw().then((r) => ({ intento: idx + 1, ...r }))
    )
    const resultados = await Promise.all(llamadas)
    setRateResults(resultados.sort((a, b) => a.intento - b.intento))
    setTestingRate(false)
  }

  const exitosos = rateResults.filter((r) => r.status === 200).length
  const bloqueados429 = rateResults.filter((r) => r.status === 429).length

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-stone-900">Evidencia Seguridad, JWT & Rate Limiting (EVA 4)</h2>
          <p className="text-sm text-stone-500">
            Herramienta práctica para demostrar JWT, Hashing Argon2, OpenAPI y Throttling de API Gateway en la defensa.
          </p>
        </div>
        <a
          href={`${apiBase}/api/v1/docs/`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-stone-900 text-white text-sm font-semibold rounded-lg hover:bg-stone-800"
        >
          Abrir Swagger / OpenAPI <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* JWT Payload */}
        <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 font-bold text-stone-800">
            <KeyRound className="w-5 h-5 text-rose-600" /> Token JWT Activo (Payload Decodificado)
          </div>
          <pre className="bg-stone-900 text-emerald-300 text-xs p-4 rounded-xl overflow-x-auto">
            {JSON.stringify(jwtPayload, null, 2)}
          </pre>
        </div>

        {/* Contraseñas y Hashing */}
        <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 font-bold text-stone-800">
            <ShieldAlert className="w-5 h-5 text-emerald-600" /> Identidad & Protección de Contraseñas (`/api/v1/auth/me/`)
          </div>
          <pre className="bg-stone-900 text-sky-300 text-xs p-4 rounded-xl overflow-x-auto">
            {JSON.stringify(meInfo, null, 2)}
          </pre>
        </div>
      </div>

      {/* Probador de Rate Limit API Gateway */}
      <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-stone-900 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" /> Prueba de Rate Limiting / Throttling (API Gateway)
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Envía 12 solicitudes simultáneas a <code className="bg-stone-100 px-1 rounded">{apiBase}/api/v1/health/</code>.
              Con API Gateway configurado (ej. rate=2 req/s, burst=5), observarás respuestas <strong>429 Too Many Requests</strong>.
            </p>
          </div>
          <button
            onClick={probarRateLimit}
            disabled={testingRate}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-lg text-sm disabled:opacity-50"
          >
            {testingRate ? 'Enviando ráfaga...' : 'Lanzar Ráfaga (12 requests)'}
          </button>
        </div>

        {rateResults.length > 0 && (
          <div className="space-y-3">
            <div className="flex gap-4 text-sm font-semibold">
              <span className="text-emerald-700">200 OK: {exitosos}</span>
              <span className="text-red-600">429 Too Many Requests: {bloqueados429}</span>
              <span className="text-stone-600">Otros: {rateResults.length - exitosos - bloqueados429}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {rateResults.map((r) => (
                <div
                  key={r.intento}
                  className={`p-2 rounded-lg border text-xs font-mono text-center ${
                    r.status === 200
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : r.status === 429
                      ? 'bg-red-50 border-red-300 text-red-700 font-bold'
                      : 'bg-amber-50 border-amber-200 text-amber-800'
                  }`}
                >
                  #{r.intento} → HTTP {r.status} ({r.elapsedMs}ms)
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
