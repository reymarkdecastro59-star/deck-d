import { useCallback } from 'react'
import { apiFetch } from '@/api/client'
import { useApiResource } from '@/app/hooks/useApiResource'

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
  // Sessions endpoint is range-agnostic — fetch once and let the client
  // aggregations filter by window. Range switches only refetch /dashboard,
  // halving network chatter on toggles.
  const sessionsRes = useApiResource(() =>
    apiFetch('/sessions?limit=500').then((r) => r.sessions || [])
  )

  const dashRes = useApiResource(() => {
    const rangeWindow = rangeToWindow(range)
    const dashPath = rangeWindow
      ? `/dashboard?from=${rangeWindow.from}&to=${rangeWindow.to}`
      : '/dashboard'
    return apiFetch(dashPath)
  }, [range])

  const reloadSessions = sessionsRes.reload
  const reloadDash = dashRes.reload
  const reload = useCallback(() => {
    reloadSessions()
    reloadDash()
  }, [reloadSessions, reloadDash])

  return {
    summary: dashRes.data,
    sessions: sessionsRes.data ?? [],
    loading: sessionsRes.loading || dashRes.loading,
    error: sessionsRes.error || dashRes.error,
    reload,
  }
}
