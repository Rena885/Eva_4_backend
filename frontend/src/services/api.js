const DEFAULT_API_URL = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '')

const STORAGE_ACCESS = 'dulce_arte_jwt_access'
const STORAGE_REFRESH = 'dulce_arte_jwt_refresh'
const STORAGE_USER = 'dulce_arte_jwt_user'
const STORAGE_API_OVERRIDE = 'dulce_arte_api_override'

export function getApiBaseUrl() {
  const override = localStorage.getItem(STORAGE_API_OVERRIDE)
  return (override || DEFAULT_API_URL).replace(/\/+$/, '')
}

export function setApiBaseUrlOverride(url) {
  const clean = (url || '').trim().replace(/\/+$/, '')
  if (!clean) {
    localStorage.removeItem(STORAGE_API_OVERRIDE)
  } else {
    localStorage.setItem(STORAGE_API_OVERRIDE, clean)
  }
}

export function getStoredSession() {
  try {
    const access = localStorage.getItem(STORAGE_ACCESS)
    const refresh = localStorage.getItem(STORAGE_REFRESH)
    const userRaw = localStorage.getItem(STORAGE_USER)
    return {
      access,
      refresh,
      user: userRaw ? JSON.parse(userRaw) : null,
    }
  } catch {
    return { access: null, refresh: null, user: null }
  }
}

export function clearSession() {
  localStorage.removeItem(STORAGE_ACCESS)
  localStorage.removeItem(STORAGE_REFRESH)
  localStorage.removeItem(STORAGE_USER)
}

function saveSession({ access, refresh, usuario }) {
  if (access) localStorage.setItem(STORAGE_ACCESS, access)
  if (refresh) localStorage.setItem(STORAGE_REFRESH, refresh)
  if (usuario) localStorage.setItem(STORAGE_USER, JSON.stringify(usuario))
}

export function decodeJwtPayload(token) {
  if (!token) return null
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(jsonPayload)
  } catch {
    return null
  }
}

async function refreshAccessToken() {
  const { refresh } = getStoredSession()
  if (!refresh) return null

  const res = await fetch(`${getApiBaseUrl()}/api/v1/auth/token/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh }),
  })

  if (!res.ok) {
    clearSession()
    return null
  }

  const data = await res.json()
  saveSession({ access: data.access, refresh: data.refresh || refresh })
  return data.access
}

export async function apiRequest(path, options = {}) {
  const { method = 'GET', body = null, auth = true, isFormData = false } = options
  const url = `${getApiBaseUrl()}${path}`

  const headers = { ...(options.headers || {}) }
  if (!isFormData && body !== null && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }

  if (auth) {
    const { access } = getStoredSession()
    if (access) {
      headers['Authorization'] = `Bearer ${access}`
    }
  }

  const fetchOpts = {
    method,
    headers,
    body: body === null ? undefined : isFormData ? body : JSON.stringify(body),
  }

  let res = await fetch(url, fetchOpts)

  if (res.status === 401 && auth) {
    const newAccess = await refreshAccessToken()
    if (newAccess) {
      headers['Authorization'] = `Bearer ${newAccess}`
      res = await fetch(url, { ...fetchOpts, headers })
    }
  }

  const text = await res.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = { detail: text }
  }

  if (!res.ok) {
    const message =
      data?.error ||
      data?.detail ||
      (typeof data === 'object' && data !== null
        ? Object.entries(data)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
            .join(' | ')
        : null) ||
      `Error HTTP ${res.status}`
    const err = new Error(message)
    err.status = res.status
    err.payload = data
    throw err
  }

  return data
}

export async function loginWithJwt(username, password) {
  const data = await apiRequest('/api/v1/auth/token/', {
    method: 'POST',
    body: { username, password },
    auth: false,
  })
  saveSession(data)
  return data
}

export async function fetchHealthRaw() {
  const started = performance.now()
  const res = await fetch(`${getApiBaseUrl()}/api/v1/health/`)
  const elapsedMs = Math.round(performance.now() - started)
  let data = null
  try {
    data = await res.json()
  } catch {
    data = null
  }
  return { status: res.status, ok: res.ok, elapsedMs, data }
}
