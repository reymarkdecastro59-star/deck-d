import { apiFetch } from '@/api/client'

/** { configured, link } — link is the connected Steam account or null. */
export function getSteam() {
  return apiFetch('/steam')
}

/** Start "Connect Steam": returns { url } of Steam's own sign-in page. */
export function connectSteam(origin) {
  return apiFetch('/steam/connect', { method: 'POST', body: JSON.stringify({ origin }) })
}

/** Hand Steam's sign-in answer (openid.* params) to the backend to verify. */
export function linkSteam(params) {
  return apiFetch('/steam/link', { method: 'POST', body: JSON.stringify({ params }) })
}

/** Re-import the library through the Steam connection. */
export function syncSteam() {
  return apiFetch('/steam/sync', { method: 'POST' })
}

export function disconnectSteam() {
  return apiFetch('/steam/link', { method: 'DELETE' })
}
