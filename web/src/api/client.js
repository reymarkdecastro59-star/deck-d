import { getIdToken, logout } from '@/auth/cognito'

const API_URL = import.meta.env.VITE_API_URL

// Guard against the .env.example placeholder still being in .env.local.
// Without this check, calls resolve to http://localhost:5173/YOUR_API_GATEWAY_URL/...
// which the Vite dev server serves as index.html, and res.json() then
// throws "Unexpected token '<'" — useless to the user.
const IS_CONFIGURED =
  typeof API_URL === 'string' &&
  API_URL.length > 0 &&
  API_URL !== 'YOUR_API_GATEWAY_URL' &&
  /^https?:\/\//i.test(API_URL)

/**
 * apiFetch — the one place that talks to the DECK'D API.
 *
 * options.raw = true → resolve with the Response object instead of JSON.
 * Used for 204-empty responses (profile delete) and blob downloads (export).
 * The 401 → forced logout path is centralised here so no caller needs to
 * duplicate it.
 */
export async function apiFetch(path, options = {}) {
  if (!IS_CONFIGURED) {
    throw new Error(
      'Backend not configured. Set VITE_API_URL in web/.env.local to your API Gateway URL, then restart the dev server.'
    )
  }

  const { raw = false, headers: callerHeaders, ...fetchOptions } = options
  const token = getIdToken()
  const headers = {
    ...(raw ? {} : { 'Content-Type': 'application/json' }),
    ...(token && { Authorization: `Bearer ${token}` }),
    ...callerHeaders,
  }
  const res = await fetch(`${API_URL}${path}`, { ...fetchOptions, headers })

  if (res.status === 401) {
    logout()
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`API ${res.status}: ${body}`)
  }
  if (raw) return res

  // If the server returned HTML (misconfigured proxy, wrong URL, dev-server
  // fallback) res.json() will die with an unreadable parse error. Peek at
  // the content-type first and surface something actionable instead.
  const contentType = res.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    throw new Error(
      `Expected JSON from ${path} but got ${contentType || 'unknown content-type'}. Check VITE_API_URL points at your API Gateway, not the dev server.`
    )
  }
  return res.json()
}
