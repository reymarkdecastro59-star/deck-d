import { useEffect, useMemo, useState } from 'react'
import { apiFetch } from '@/api/client'
import { PRESENCE_ENABLED, TrackingContext, describeSync } from './trackingContext'

const POLL_MS = 60_000

/**
 * Polls /devices (sync status), /presence (live game, when enabled) and the
 * newest session. Pauses while the tab is hidden so a backgrounded tab
 * doesn't keep hitting the API.
 */
export function TrackingProvider({ children }) {
  const [sync, setSync] = useState({ status: 'unknown', lastSyncAt: null, label: 'Checking sync…' })
  const [live, setLive] = useState(null)
  const [lastSession, setLastSession] = useState(null)

  useEffect(() => {
    let cancelled = false
    let timer = null

    const tick = async () => {
      const jobs = [
        apiFetch('/devices')
          .then((b) => !cancelled && setSync(describeSync(b.devices)))
          .catch(() => !cancelled && setSync((s) => ({ ...s, status: 'unknown' }))),
        apiFetch('/sessions?limit=1')
          .then((b) => !cancelled && setLastSession(b.sessions?.[0] ?? null))
          .catch(() => {}),
      ]
      if (PRESENCE_ENABLED || (import.meta.env.DEV && window.__DECKD_MOCK_LIVE__)) {
        jobs.push(
          apiFetch('/presence')
            .then((b) => !cancelled && setLive(b.presence?.[0] ?? null))
            .catch(() => !cancelled && setLive(null))
        )
      }
      await Promise.all(jobs)
    }

    const start = () => {
      if (timer) return
      tick()
      timer = setInterval(tick, POLL_MS)
    }
    const stop = () => {
      if (timer) clearInterval(timer)
      timer = null
    }
    const onVisibility = () => (document.hidden ? stop() : start())

    start()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      cancelled = true
      stop()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  const value = useMemo(() => ({ sync, live, lastSession }), [sync, live, lastSession])
  return <TrackingContext.Provider value={value}>{children}</TrackingContext.Provider>
}
