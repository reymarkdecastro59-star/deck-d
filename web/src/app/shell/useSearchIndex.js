import { useEffect, useMemo, useState } from 'react'
import { apiFetch } from '@/api/client'
import { formatDate, formatDuration } from '@/lib/format'

// Static page shortcuts always appear at the top so "settings", "devices",
// etc. resolve instantly even before the network payload lands. Route
// icons stay at the site of use (result renderer) to keep this file cheap.
const PAGE_SHORTCUTS = [
  { id: 'page:dashboard', kind: 'page', title: 'Dashboard', hint: 'Overview', link: '/dashboard' },
  { id: 'page:library', kind: 'page', title: 'Library', hint: 'All games', link: '/library' },
  { id: 'page:sessions', kind: 'page', title: 'Sessions', hint: 'Play history', link: '/sessions' },
  {
    id: 'page:recs',
    kind: 'page',
    title: 'For You',
    hint: 'Recommendations from your play',
    link: '/for-you',
  },
  { id: 'page:stats', kind: 'page', title: 'Stats', hint: 'Analytics', link: '/stats' },
  { id: 'page:devices', kind: 'page', title: 'Devices', hint: 'Trackers', link: '/devices' },
  { id: 'page:settings', kind: 'page', title: 'Settings', hint: 'Preferences', link: '/settings' },
]

const MAX_RESULTS = 20

// One-shot fetch keyed to the dialog being open. The shell hook only
// loads when the user first opens the modal — no need to preload for
// every page nav. Result: search is instant on the second open (cached
// in state), and free until then.
export function useSearchIndex(active) {
  const [games, setGames] = useState([])
  const [sessions, setSessions] = useState([])
  const [fetched, setFetched] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!active || fetched) return
    let cancelled = false
    Promise.all([apiFetch('/dashboard'), apiFetch('/sessions?limit=200')])
      .then(([dash, sess]) => {
        if (cancelled) return
        setGames(dash.games ?? [])
        setSessions(sess.sessions ?? [])
        setError(null)
        // Only mark "fetched" on success — otherwise a transient failure
        // (first open with no network) would freeze the search forever
        // because the effect would refuse to re-run on the next open.
        setFetched(true)
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || 'Search index unavailable')
      })
    return () => {
      cancelled = true
    }
  }, [active, fetched])

  // Loading is derived — "active but not yet fetched and no error" — so we
  // avoid a redundant setState-in-effect for the flag.
  const loading = active && !fetched && !error

  const gameEntries = useMemo(
    () =>
      games.map((g) => ({
        id: `game:${g.rawg_id ?? g.slug ?? g.game}`,
        kind: 'game',
        title: g.game,
        hint: g.total_hours != null ? `${g.total_hours}h played` : null,
        link: `/library/${encodeURIComponent(g.slug ?? g.game)}`,
        haystack: (g.game || '').toLowerCase(),
      })),
    [games]
  )

  const sessionEntries = useMemo(
    () =>
      sessions.map((s) => ({
        id: `session:${s.session_id}`,
        kind: 'session',
        title: s.game_name || 'Unknown game',
        hint: `${formatDate(s.started_at, 'time')} · ${formatDuration(s.duration_sec)}`,
        link: '/sessions',
        haystack: (s.game_name || '').toLowerCase(),
      })),
    [sessions]
  )

  const search = useMemo(() => {
    const pageEntries = PAGE_SHORTCUTS.map((p) => ({ ...p, haystack: p.title.toLowerCase() }))
    return (query) => {
      const q = query.trim().toLowerCase()
      if (!q) return pageEntries.slice(0, MAX_RESULTS)
      // Prefix match wins over includes so typing "lib" surfaces Library
      // before "Old Republic Library" — matches expected editor-style ranking.
      const scored = [...pageEntries, ...gameEntries, ...sessionEntries]
        .map((entry) => {
          const idx = entry.haystack.indexOf(q)
          if (idx === -1) return null
          return { entry, score: idx === 0 ? 0 : 1 + idx }
        })
        .filter(Boolean)
        .sort((a, b) => a.score - b.score)
      // De-duplicate by title within kind — a session and a game with the
      // same title are both useful, but two sessions of the same game are
      // clutter. Keep the first (highest-ranked) per kind+title.
      const seen = new Set()
      const out = []
      for (const { entry } of scored) {
        const key = `${entry.kind}:${entry.title.toLowerCase()}`
        if (seen.has(key)) continue
        seen.add(key)
        out.push(entry)
        if (out.length >= MAX_RESULTS) break
      }
      return out
    }
  }, [gameEntries, sessionEntries])

  return { search, loading, error }
}
