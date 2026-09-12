import { apiFetch } from '@/api/client'
import { useApiResource } from '@/app/hooks/useApiResource'

// Library reuses the aggregated /dashboard payload — same games array, same
// server-side dedupe + decay math. No dedicated /library endpoint exists yet.
export function useLibrary() {
  const { data, loading, error, reload } = useApiResource(() => apiFetch('/dashboard'))
  return { summary: data, loading, error, reload }
}
