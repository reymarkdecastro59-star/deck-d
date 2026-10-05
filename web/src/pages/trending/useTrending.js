import { apiFetch } from '@/api/client'
import { useApiResource } from '@/app/hooks/useApiResource'

// Trending is one shared daily list (RAWG, refreshed 03:00 UTC). The
// `tier=trending` request skips the personal tiers, so it stays fast.
export function useTrending() {
  return useApiResource(() => apiFetch('/recommendations?tier=trending'))
}
