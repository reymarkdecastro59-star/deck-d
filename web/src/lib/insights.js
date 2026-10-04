// Rule-based play insights — deterministic, testable, no LLM.
// Each rule returns null or { id, text, game?, bars?, threshold? }. The first
// rule that fires wins, so order = priority. Copy follows the UX v2 rules:
// describe, never judge (R21), no streak pressure (R20).

const WINDOW_DAYS = 30
const SHORT_MIN = 45
const LONG_HOURS = 2

function recent(sessions, now) {
  const from = now / 1000 - WINDOW_DAYS * 86_400
  return (sessions || []).filter((s) => s?.started_at >= from && s.duration_sec > 0)
}

function byGame(list) {
  const map = new Map()
  for (const s of list) {
    if (!s.game_name) continue
    if (!map.has(s.game_name)) map.set(s.game_name, [])
    map.get(s.game_name).push(s)
  }
  return map
}

function shortBursts(list) {
  let best = null
  for (const [game, rows] of byGame(list)) {
    if (rows.length < 5) continue
    const short = rows.filter((s) => s.duration_sec / 60 < SHORT_MIN).length
    if (short / rows.length < 0.8) continue
    if (!best || rows.length > best.rows.length) best = { game, rows, short }
  }
  if (!best) return null
  const n = best.rows.length
  return {
    id: 'short-bursts',
    game: best.game,
    text: `You play ${best.game} in short bursts: ${n} sessions in the last 30 days, ${
      best.short === n ? 'all' : best.short
    } under ${SHORT_MIN} minutes.`,
    bars: best.rows.slice(0, 12).map((s) => Math.round(s.duration_sec / 60)),
    threshold: SHORT_MIN,
  }
}

function longSessions(list) {
  let best = null
  for (const [game, rows] of byGame(list)) {
    if (rows.length < 3) continue
    const avgH = rows.reduce((a, s) => a + s.duration_sec, 0) / rows.length / 3600
    if (avgH < LONG_HOURS) continue
    if (!best || avgH > best.avgH) best = { game, rows, avgH }
  }
  if (!best) return null
  return {
    id: 'long-sessions',
    game: best.game,
    text: `${best.game} gets your long sittings: ${best.rows.length} sessions averaging ${best.avgH.toFixed(1)} h.`,
    bars: best.rows.slice(0, 12).map((s) => Math.round(s.duration_sec / 60)),
    threshold: LONG_HOURS * 60,
  }
}

function evenings(list) {
  if (list.length < 6) return null
  const evening = list.filter((s) => new Date(s.started_at * 1000).getHours() >= 18).length
  const pct = Math.round((evening / list.length) * 100)
  if (pct < 60) return null
  return {
    id: 'evenings',
    text: `Most of your play happens in the evening: ${pct}% of your sessions in the last 30 days started after 18:00.`,
  }
}

function weekendLean(list) {
  if (list.length < 6) return null
  const weekend = list.filter((s) => [0, 6].includes(new Date(s.started_at * 1000).getDay())).length
  const pct = Math.round((weekend / list.length) * 100)
  if (pct < 55) return null
  return {
    id: 'weekends',
    text: `You're a weekend player: ${pct}% of your recent sessions were on Saturday or Sunday.`,
  }
}

export const RULES = [shortBursts, longSessions, evenings, weekendLean]

export function pickInsight(sessions, now = Date.now()) {
  const list = recent(sessions, now)
  for (const rule of RULES) {
    const hit = rule(list)
    if (hit) return hit
  }
  return null
}
