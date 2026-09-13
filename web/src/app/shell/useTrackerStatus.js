import { useEffect, useState } from 'react'
import { apiFetch } from '@/api/client'

const POLL_INTERVAL_MS = 60_000 // 1 minute is enough — tracker heartbeat is per-session
const FRESH_WINDOW_SEC = 5 * 60 // last_seen within 5 min counts as online

// Derives overall tracker status from /devices last_seen. Any active
// (non-revoked) device with a recent heartbeat wins — we intentionally
// don't try to disambiguate per-device here because the pill is a
// single-signal summary. If someone wants per-device state, they open
// the Devices page.
export function useTrackerStatus() {
  const [status, setStatus] = useState('unknown')
  const [label, setLabel] = useState(null)

  useEffect(() => {
    let cancelled = false
    let timer = null

    const check = async () => {
      try {
        const body = await apiFetch('/devices')
        if (cancelled) return
        const active = (body.devices ?? []).filter((d) => !d.revoked_at && d.last_seen)
        if (active.length === 0) {
          setStatus('offline')
          setLabel('No tracker registered')
          return
        }
        const now = Math.floor(Date.now() / 1000)
        const latest = Math.max(...active.map((d) => d.last_seen))
        const ageSec = now - latest
        if (ageSec <= FRESH_WINDOW_SEC) {
          setStatus('online')
          setLabel('Tracker online')
        } else {
          setStatus('offline')
          const mins = Math.floor(ageSec / 60)
          setLabel(mins < 60 ? `Last seen ${mins}m ago` : `Last seen ${Math.floor(mins / 60)}h ago`)
        }
      } catch {
        if (!cancelled) {
          setStatus('unknown')
          setLabel('Checking tracker…')
        }
      }
    }

    check()
    timer = setInterval(check, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      if (timer) clearInterval(timer)
    }
  }, [])

  return { status, label }
}
