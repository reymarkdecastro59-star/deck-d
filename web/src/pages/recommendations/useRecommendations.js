import { apiFetch } from '@/api/client'
import { useApiResource } from '@/app/hooks/useApiResource'

// Recommendations returns three tiers. Any tier can come back null when the
// user hasn't played enough games yet, or the tier's upstream (RAWG / Bedrock)
// is degraded. Null means "hide the tier or show the locked note", never error.
export function useRecommendations() {
  const { data, loading, error, reload } = useApiResource(() => apiFetch('/recommendations'))
  return { data, loading, error, reload }
}
