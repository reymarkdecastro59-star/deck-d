import { useCallback, useEffect, useState } from 'react'
import { apiFetch } from '@/api/client'

// Recommendations returns three tiers. Any tier can come back null when the
// user hasn't played enough games yet, or the tier's upstream (RAWG / Bedrock)
// is degraded. Null means "hide the tier or show the locked note", never error.
export function useRecommendations() {
  const [data, setData] = useState(null)
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
    apiFetch('/recommendations')
      .then((body) => {
        if (cancelled) return
        setData(body)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err.message || 'Failed to load recommendations')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  return { data, loading, error, reload }
}
