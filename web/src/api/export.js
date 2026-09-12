import { apiFetch } from '@/api/client'

// /export returns text (CSV) or JSON with a Content-Disposition header. We
// need the raw Response to read the blob + filename header, but the auth /
// 401 path lives in apiFetch — using raw:true lets us reuse it.
export async function downloadExport(format = 'csv') {
  if (format !== 'csv' && format !== 'json') {
    throw new Error(`Unsupported export format: ${format}`)
  }
  const res = await apiFetch(`/export?format=${format}`, { raw: true })

  // Filename comes from a server-controlled header — sanitise before assigning
  // to a.download. A compromised or bugged backend could otherwise supply path
  // separators, an unexpected extension, or characters that trip local FS
  // policies. Strip to a narrow allowlist, then re-append the known extension
  // so we always end up with a sensible name.
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
