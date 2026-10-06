// Minimal, dependency-free JWT helpers for session freshness. We only read
// the `exp` claim to decide when to refresh; signature checks are the API's
// job (API Gateway's Cognito authorizer), never the browser's.

/** Expiry of a JWT in epoch seconds, or null if it can't be read. */
export function jwtExpiry(token) {
  if (typeof token !== 'string') return null
  const part = token.split('.')[1]
  if (!part) return null
  try {
    const b64 = part
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(part.length / 4) * 4, '=')
    const json =
      typeof atob === 'function' ? atob(b64) : Buffer.from(b64, 'base64').toString('binary')
    const exp = JSON.parse(json).exp
    return Number.isFinite(exp) ? exp : null
  } catch {
    return null
  }
}

/**
 * True when the token is missing/unreadable or expires within `skewSec`.
 * Refreshing a little early avoids a request leaving with a token that
 * expires in flight (Cognito ID tokens last 1 hour).
 */
export function isExpiringSoon(token, nowMs = Date.now(), skewSec = 120) {
  const exp = jwtExpiry(token)
  if (exp == null) return true
  return exp - skewSec <= Math.floor(nowMs / 1000)
}
