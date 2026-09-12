import { getIdToken, logout } from '@/auth/cognito'

const API_URL = import.meta.env.VITE_API_URL

/**
 * apiFetch — the one place that talks to the DECK'D API.
 *
 * options.raw = true → resolve with the Response object instead of JSON.
 * Used for 204-empty responses (profile delete) and blob downloads (export).
 * The 401 → forced logout path is centralised here so no caller needs to
 * duplicate it.
 */
export async function apiFetch(path, options = {}) {
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
  return res.json()
}
