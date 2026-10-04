import { useEffect, useState } from 'react'
import { apiFetch } from '@/api/client'
import { useApiResource } from '@/app/hooks/useApiResource'

// Overview data. The aggregate + ~2 weeks of raw sessions load together (one
// loading/error surface for the page). 200 rows covers this week, last week
// and the 30-day insight window for nearly everyone.
export function useDashboard() {
  const { data, loading, error, reload } = useApiResource(() =>
    Promise.all([apiFetch('/dashboard'), apiFetch('/sessions?limit=200')]).then(([dash, sess]) => ({
      summary: dash,
      recent: sess.sessions || [],
    }))
  )

  return {
    summary: data?.summary ?? null,
    recent: data?.recent ?? [],
    loading,
    error,
    reload,
  }
}

// "Next up" loads separately and never blocks or fails the page: if
// recommendations are slow or degraded the banner simply doesn't render.
export function useNextUp(enabled) {
  const [state, setState] = useState({ pick: null, loading: enabled })
  useEffect(() => {
    if (!enabled) return undefined
    let cancelled = false
    apiFetch('/recommendations')
      .then((r) => {
        if (cancelled) return
        const pick = r?.top_picks?.[0] ?? r?.genre_based?.[0] ?? null
        setState({
          pick: pick ? { ...pick, tier: r?.top_picks?.[0] ? 'top' : 'genre' } : null,
          loading: false,
        })
      })
      .catch(() => !cancelled && setState({ pick: null, loading: false }))
    return () => {
      cancelled = true
    }
  }, [enabled])
  return state
}
