import { apiFetch } from '@/api/client'

/** What's been imported from each launcher, plus any pending re-import request. */
export function listImports() {
  return apiFetch('/imports')
}

/**
 * Ask the user's PC to re-import. Launcher files live on the PC, so the
 * tracker does the reading; it picks this up on its next check-in (~1 min).
 */
export function requestImport() {
  return apiFetch('/imports/request', { method: 'POST' })
}

/** Remove one launcher's imported data. Tracked sessions are untouched. */
export function deleteImport(source) {
  return apiFetch(`/imports/${encodeURIComponent(source)}`, { method: 'DELETE' })
}
