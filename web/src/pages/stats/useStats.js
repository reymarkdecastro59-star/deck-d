import { useCallback, useEffect, useState } from 'react'
import { apiFetch } from '@/api/client'

// Range values map to a lookback in days, or null for all-time.
// Backend does the union math server-side when `from`/`to` are supplied, so
// headline hours are accurate per range even though the client also aggregates
// the raw session list for heatmap / distribution views.
const RANGE_DAYS = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  all: null,
}

export function rangeToWindow(range, now = Math.floor(Date.now() / 1000)) {
  const days = RANGE_DAYS[range]
  if (days == null) return null
  return { from: now - days * 24 * 3600, to: now }
}

export function useStats(range = 'all') {
  const [summary, setSummary] = useState(null)
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  const reload = useCallback(() => {
    setLoading(true)
    setError(null)
    setReloadKey((k) => k + 1)
  }, [])

  useEffect(() => {
    let cancelled = false

    const window = rangeToWindow(range)
    const dashPath = window ? `/dashboard?from=${window.from}&to=${window.to}` : '/dashboard'

    // Ask sessions for the max allowed (500). Client-side aggregations filter
    // by the range window so the same fetch serves every range switch until
    // the user reloads. On range change we keep the previous data visible
    // (stale-while-revalidate) — the reload button is the explicit "wipe and
    // refetch" affordance.
    Promise.all([apiFetch(dashPath), apiFetch('/sessions?limit=500')])
      .then(([dash, sess]) => {
        if (cancelled) return
        setSummary(dash)
        setSessions(sess.sessions || [])
      })
      .catch((err) => {
        if (cancelled) return
        setError(err.message || 'Failed to load stats')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [range, reloadKey])

  return { summary, sessions, loading, error, reload }
}
