import { getIdToken, logout } from '@/auth/cognito'

const API_URL = import.meta.env.VITE_API_URL

// /export returns text (CSV) or JSON with a Content-Disposition header. We
// can't use apiFetch because it always parses as JSON — fetch as blob, honor
// the server-provided filename, and trigger a download in the browser.
export async function downloadExport(format = 'csv') {
  if (format !== 'csv' && format !== 'json') {
    throw new Error(`Unsupported export format: ${format}`)
  }
  const token = getIdToken()
  const res = await fetch(`${API_URL}/export?format=${format}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (res.status === 401) {
    logout()
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Export ${res.status}: ${body}`)
  }

  // Filename comes from a server-controlled header — sanitise before assigning
  // to a.download. A compromised or bugged backend could otherwise supply path
  // separators, an unexpected extension, or characters that trip local FS
  // policies. Strip everything to a narrow allowlist, then re-append the known
  // extension so we always end up with a sensible name.
  const cd = res.headers.get('Content-Disposition') || ''
  const match = /filename="([^"]+)"/.exec(cd)
  const rawName = match?.[1] || `deckd-export.${format}`
  const safeName = rawName.replace(/[^a-zA-Z0-9._-]/g, '_') || `deckd-export.${format}`
  const filename = safeName.endsWith(`.${format}`) ? safeName : `${safeName}.${format}`

  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  return filename
}
