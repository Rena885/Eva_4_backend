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
    <div className="space-y-5">
      <div className="da-card p-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-[#462842]">Seguridad API, JWT, Argon2 &amp; Rate Limiting (EVA 4)</h2>
          <p className="text-xs md:text-sm text-[#7f6a7c] mt-0.5">
            Verificación en vivo de claims JWT, hashing Argon2id en RDS, documentación OpenAPI y throttling de API Gateway.
          </p>
        </div>
        <a
          href={`${apiBase}/api/v1/docs/`}
          target="_blank"
          rel="noreferrer"
          className="btn-dulce inline-flex items-center gap-2 px-4 py-2 text-xs md:text-sm"
        >
          Abrir Swagger / OpenAPI <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="da-card p-5 space-y-3">
          <div className="flex items-center gap-2 font-extrabold text-[#462842] text-sm">
            <KeyRound className="w-5 h-5 text-[#d9739f]" /> Token JWT Activo (Payload Decodificado)
          </div>
          <pre className="bg-[#331e30] text-emerald-300 text-xs p-4 rounded-2xl overflow-x-auto">
            {JSON.stringify(jwtPayload, null, 2)}
          </pre>
        </div>

        <div className="da-card p-5 space-y-3">
          <div className="flex items-center gap-2 font-extrabold text-[#462842] text-sm">
            <ShieldAlert className="w-5 h-5 text-[#9e7be6]" /> Identidad &amp; Hasher (`/api/v1/auth/me/`)
          </div>
          <pre className="bg-[#331e30] text-pink-200 text-xs p-4 rounded-2xl overflow-x-auto">
            {JSON.stringify(meInfo, null, 2)}
          </pre>
        </div>
      </div>

      <div className="da-card p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-extrabold text-[#462842] flex items-center gap-2">
              <Zap className="w-5 h-5 text-[#e07a52]" /> Prueba de Rate Limiting / Throttling (API Gateway)
            </h3>
            <p className="text-xs text-[#7f6a7c] mt-0.5">
              Envía 12 solicitudes simultáneas a <code className="bg-[#fdf2f8] text-[#5e3a5a] px-1.5 py-0.5 rounded">{apiBase}/api/v1/health/</code>.
              Con throttling activo (rate=2 req/s, burst=5), observarás respuestas <strong>429 Too Many Requests</strong>.
            </p>
          </div>
          <button
            type="button"
            onClick={probarRateLimit}
            disabled={testingRate}
            className="btn-dulce px-4 py-2 text-xs md:text-sm cursor-pointer"
          >
            {testingRate ? 'Enviando ráfaga...' : 'Lanzar Ráfaga (12 requests)'}
          </button>
        </div>

        {rateResults.length > 0 && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-4 text-sm font-bold">
              <span className="text-emerald-700">200 OK: {exitosos}</span>
              <span className="text-rose-700">429 Too Many Requests: {bloqueados429}</span>
              <span className="text-[#7f6a7c]">Otros: {rateResults.length - exitosos - bloqueados429}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {rateResults.map((r) => (
                <div
                  key={r.intento}
                  className={`p-2 rounded-xl border text-xs font-mono text-center ${
                    r.status === 200
                      ? 'bg-[#eefbf4] border-[#bfe8d1] text-emerald-800'
                      : r.status === 429
                      ? 'bg-rose-50 border-rose-300 text-rose-800 font-bold'
                      : 'bg-[#fff7ea] border-[#f5deb3] text-amber-800'
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
