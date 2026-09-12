import { apiFetch } from '@/api/client'
import { useApiResource } from '@/app/hooks/useApiResource'

// Parallel fetch: aggregate dashboard + a small window of raw sessions for
// the "recent sessions" panel and the weekly activity spark. Kept as one
// hook so the page has one loading + error surface.
export function useDashboard() {
  const { data, loading, error, reload } = useApiResource(() =>
    Promise.all([apiFetch('/dashboard'), apiFetch('/sessions?limit=50')]).then(([dash, sess]) => ({
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
