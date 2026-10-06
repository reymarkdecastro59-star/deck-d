import { apiFetch } from '@/api/client'
import { useApiResource } from '@/app/hooks/useApiResource'
import { matchesKey } from './gameKey'

// GameDetail hydrates from two endpoints in parallel:
//   /dashboard   — aggregated per-game row (hours, momentum, cover)
//   /sessions    — flat sessions we filter to this game client-side
//
// TODO(backend): a proper /games/{key}/sessions endpoint would let us drop
// the client-side matching (which misses cross-launcher dedupe by rawg_id
// when the session isn't yet in the RAWG cache).
export function useGameDetail(key) {
  const { data, loading, error, reload } = useApiResource(
    () =>
      Promise.all([apiFetch('/dashboard'), apiFetch('/sessions?limit=500')]).then(
        ([dash, sess]) => {
          const match = (dash.games || []).find((g) => matchesKey(g, key))
          if (!match) return { notFound: true }
          const name = (match.game || '').toLowerCase()
          return {
            game: match,
            halfLifeDays: dash.half_life_days ?? null,
            sessions: (sess.sessions || []).filter(
              (s) => (s.game_name || '').toLowerCase() === name
            ),
            notFound: false,
          }
        }
      ),
    [key]
  )

  return {
    game: data?.game ?? null,
    halfLifeDays: data?.halfLifeDays ?? null,
    sessions: data?.sessions ?? [],
    notFound: data?.notFound === true,
    loading,
    error,
    reload,
  }
}
