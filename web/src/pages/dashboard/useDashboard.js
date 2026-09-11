import { useCallback, useEffect, useState } from 'react'
import { apiFetch } from '@/api/client'

// Parallel fetch: aggregate dashboard + a small window of raw sessions for the
// "recent sessions" panel and the weekly activity spark. Kept as a single hook
// so the page has one loading + error surface to render.
export function useDashboard() {
  const [summary, setSummary] = useState(null)
  const [recent, setRecent] = useState([])
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

    Promise.all([apiFetch('/dashboard'), apiFetch('/sessions?limit=50')])
      .then(([dash, sess]) => {
        if (cancelled) return
        setSummary(dash)
        setRecent(sess.sessions || [])
      })
      .catch((err) => {
        if (cancelled) return
        setError(err.message || 'Failed to load dashboard')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [reloadKey])

  return { summary, recent, loading, error, reload }
}
