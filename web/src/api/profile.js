import { apiFetch } from '@/api/client'
import { getIdToken, logout } from '@/auth/cognito'

const API_URL = import.meta.env.VITE_API_URL

export function getProfile() {
  return apiFetch('/profile')
}

export function patchProfile(fields) {
  return apiFetch('/profile', {
    method: 'PATCH',
    body: JSON.stringify(fields),
  })
}

// DELETE /profile returns 204 with an empty body, so we bypass apiFetch (which
// always calls res.json()) and hand-roll the request. Callers should force a
// sign-out on success — the Cognito identity is gone.
export async function deleteProfile() {
  const token = getIdToken()
  const res = await fetch(`${API_URL}/profile`, {
    method: 'DELETE',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (res.status === 401) {
    logout()
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`API ${res.status}: ${body}`)
  }
  return true
}
