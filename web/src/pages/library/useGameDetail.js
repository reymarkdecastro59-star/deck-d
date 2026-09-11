import { useCallback, useEffect, useState } from 'react'
import { apiFetch } from '@/api/client'
import { matchesKey } from './gameKey'

// GameDetail hydrates from two endpoints in parallel:
//   /dashboard   — aggregated per-game row (hours, momentum, cover)
//   /sessions    — flat sessions we filter to this game client-side
//
// TODO(backend): a proper /games/{key}/sessions endpoint would let us drop the
// client-side matching (which misses cross-launcher dedupe by rawg_id when the
// session isn't yet in the RAWG cache).
export function useGameDetail(key) {
  const [game, setGame] = useState(null)
  const [halfLifeDays, setHalfLifeDays] = useState(null)
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  const reload = useCallback(() => {
    setLoading(true)
    setError(null)
    setNotFound(false)
    setReloadKey((k) => k + 1)
  }, [])

  useEffect(() => {
    if (!key) return
    let cancelled = false

    Promise.all([apiFetch('/dashboard'), apiFetch('/sessions?limit=500')])
      .then(([dash, sess]) => {
        if (cancelled) return
        const match = (dash.games || []).find((g) => matchesKey(g, key))
        if (!match) {
          setNotFound(true)
          return
        }
        setGame(match)
        setHalfLifeDays(dash.half_life_days ?? null)
        // Match by name — same string used server-side to display the row.
        const name = (match.game || '').toLowerCase()
        setSessions((sess.sessions || []).filter((s) => (s.game_name || '').toLowerCase() === name))
      })
      .catch((err) => {
        if (cancelled) return
        setError(err.message || 'Failed to load game')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [key, reloadKey])

  return { game, halfLifeDays, sessions, loading, error, notFound, reload }
}
