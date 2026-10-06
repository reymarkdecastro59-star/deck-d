/**
 * Only allow https:// URLs into CSS `background-image: url(...)` slots.
 *
 * Rationale: game metadata comes from the RAWG cache. If the cache is ever
 * poisoned or the backend proxies a malicious CDN, a `data:` or `javascript:`
 * URI could leak cross-origin requests from an inline style. Modern browsers
 * block `javascript:` in CSS, but `data:` is still fetched — and either scheme
 * makes exfiltration easier. Restricting to https:// closes both paths.
 */
export function safeImageUrl(url) {
  if (!url || typeof url !== 'string') return null
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:') return null
    return parsed.toString()
  } catch {
    return null
  }
}

/**
 * Convenience: build a { backgroundImage, backgroundSize, backgroundPosition }
 * style object only if the URL passes the https:// check. Returns undefined
 * otherwise so the caller can conditionally render a placeholder instead.
 */
export function coverBackgroundStyle(url) {
  const safe = safeImageUrl(url)
  if (!safe) return undefined
  return {
    backgroundImage: `url(${safe})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  }
}
