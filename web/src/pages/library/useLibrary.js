import { useCallback, useEffect, useState } from 'react'
import { apiFetch } from '@/api/client'

// Library reuses the aggregated /dashboard payload — same games array, same
// server-side dedupe + decay math. No dedicated /library endpoint exists yet.
export function useLibrary() {
  const [summary, setSummary] = useState(null)
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
    apiFetch('/dashboard')
      .then((data) => {
        if (cancelled) return
        setSummary(data)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err.message || 'Failed to load library')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  return { summary, loading, error, reload }
}
