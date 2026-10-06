import { apiFetch } from '@/api/client'

export function getProfile() {
  return apiFetch('/profile')
}

export function patchProfile(fields) {
  return apiFetch('/profile', {
    method: 'PATCH',
    body: JSON.stringify(fields),
  })
}

// DELETE /profile returns 204 with an empty body. `raw: true` skips the
// automatic .json() call so we don't blow up on the empty response — the
// 401 → logout path in apiFetch still applies. Callers should force a
// sign-out on success; the Cognito identity is gone.
export async function deleteProfile() {
  await apiFetch('/profile', { method: 'DELETE', raw: true })
  return true
}
