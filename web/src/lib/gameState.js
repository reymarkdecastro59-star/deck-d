// Active / Drifting / Dormant — DECK'D's own game-state vocabulary.
// Thresholds live here and nowhere else so Overview, Library and Stats agree.
//   Active   — played in the last 7 days
//   Drifting — last played 7–30 days ago
//   Dormant  — not played for 30+ days (the API calls this "abandoned")

export const ACTIVE_DAYS = 7
export const DRIFTING_DAYS = 30

export const STATE_LABEL = { active: 'Active', drifting: 'Drifting', dormant: 'Dormant' }

export function gameState(lastPlayedUnix, now = Date.now()) {
  if (!lastPlayedUnix) return 'dormant'
  const days = (now / 1000 - lastPlayedUnix) / 86_400
  if (days < ACTIVE_DAYS) return 'active'
  if (days < DRIFTING_DAYS) return 'drifting'
  return 'dormant'
}

/** Map(game_name → latest started_at) from a newest-first or unordered list. */
export function lastPlayedByGame(sessions) {
  const out = new Map()
  for (const s of sessions || []) {
    if (!s?.game_name || !s.started_at) continue
    const prev = out.get(s.game_name)
    if (!prev || s.started_at > prev) out.set(s.game_name, s.started_at)
  }
  return out
}
