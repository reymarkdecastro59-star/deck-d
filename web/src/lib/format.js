// Shared formatters used across the authenticated app. Every page had its own
// slightly-different copy of these — consolidated here so the null-guarding
// behaviour is uniform and future changes hit one file.

const PLACEHOLDER = '—'

/**
 * formatHours(v) → compact hours string. Preserves precision for small values
 * (0.35 → "0.35"), one decimal for the mid-range (2.4 → "2.4"), and rounds
 * everything ≥ 10.
 */
export function formatHours(v) {
  if (v == null || Number.isNaN(v)) return '0'
  if (v < 1) return v.toFixed(2).replace(/\.?0+$/, '') || '0'
  if (v < 10) return v.toFixed(1)
  return Math.round(v).toString()
}

/**
 * formatMinutes(v) → "45m", "1h 20m", "2h" for a minute count.
 */
export function formatMinutes(v) {
  if (v == null || Number.isNaN(v) || v <= 0) return '0m'
  if (v < 60) return `${Math.round(v)}m`
  const h = Math.floor(v / 60)
  const m = Math.round(v - h * 60)
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

/**
 * formatDuration(seconds) → "1h 20m" or "20m" from a raw duration.
 */
export function formatDuration(seconds) {
  if (seconds == null || Number.isNaN(seconds) || seconds <= 0) return '0m'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

/**
 * relativeTime(unix) → "just now", "5m ago", "3h ago", "2d ago", or a short
 * calendar date for anything older than a week. Handles null gracefully.
 */
export function relativeTime(unix) {
  if (!unix) return PLACEHOLDER
  const diff = Date.now() / 1000 - unix
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86_400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604_800) return `${Math.floor(diff / 86_400)}d ago`
  return new Date(unix * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

const DATE_OPTIONS = {
  short: { month: 'short', day: 'numeric', year: 'numeric' },
  time: { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' },
  long: { month: 'long', day: 'numeric', year: 'numeric' },
}

/**
 * formatDate(unix, variant='short') → localised date string. Variants:
 *   short — Aug 30, 2026
 *   time  — Aug 30, 4:12 PM
 *   long  — August 30, 2026
 * Null / undefined / zero returns the em-dash placeholder.
 */
export function formatDate(unix, variant = 'short') {
  if (!unix) return PLACEHOLDER
  return new Date(unix * 1000).toLocaleDateString(undefined, DATE_OPTIONS[variant])
}
