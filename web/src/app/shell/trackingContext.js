import { createContext, useContext } from 'react'

/**
 * Shared tracking state for the signed-in shell (one fetcher, many readers):
 *   sync     — { status: 'synced'|'stale'|'none'|'unknown', lastSyncAt, label }
 *   live     — { game_name, started_at, device_name } while a game runs, else null
 *   lastSession — newest finished session row, or null
 *
 * `live` needs the agent heartbeat (backend task B10). Until the endpoint
 * ships it stays null and the UI falls back to "Last session".
 */
export const TrackingContext = createContext({
  sync: { status: 'unknown', lastSyncAt: null, label: 'Checking sync…' },
  live: null,
  lastSession: null,
})

export function useTracking() {
  return useContext(TrackingContext)
}

// Heartbeat endpoint (B10) is opt-in until the backend + agent ship it, so we
// never poll a route that doesn't exist.
export const PRESENCE_ENABLED = import.meta.env.VITE_PRESENCE === 'true'

const STALE_AFTER_SEC = 24 * 3600

/** Truthful sync label: the agent only reports when a session finishes. */
export function describeSync(devices, nowSec = Math.floor(Date.now() / 1000)) {
  const active = (devices ?? []).filter((d) => !d.revoked_at && d.last_seen)
  if (active.length === 0) return { status: 'none', lastSyncAt: null, label: 'No tracker yet' }
  const lastSyncAt = Math.max(...active.map((d) => d.last_seen))
  const age = Math.max(0, nowSec - lastSyncAt)
  const mins = Math.floor(age / 60)
  const ago =
    mins < 1
      ? 'just now'
      : mins < 60
        ? `${mins} min ago`
        : mins < 1440
          ? `${Math.floor(mins / 60)} h ago`
          : `${Math.floor(mins / 1440)} d ago`
  return {
    status: age > STALE_AFTER_SEC ? 'stale' : 'synced',
    lastSyncAt,
    label: `Synced ${ago}`,
  }
}
