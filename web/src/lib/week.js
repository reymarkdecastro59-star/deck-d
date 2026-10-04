// Week maths for the Overview: Monday-start weeks in the viewer's local time.
// Pure functions over the raw /sessions rows (unix seconds), so they can be
// unit-tested with node:test and reused by Sessions and Stats later.

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DAY_MS = 86_400_000

/** Local midnight of the Monday that starts the week containing `date`. */
export function startOfWeek(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const mondayOffset = (d.getDay() + 6) % 7 // Sun=0 → 6, Mon=1 → 0
  d.setDate(d.getDate() - mondayOffset)
  return d
}

function hoursOfDay(ms, dayStartMs) {
  return Math.min(24, Math.max(0, (ms - dayStartMs) / 3_600_000))
}

/**
 * weekSummary(sessions, now) → this week's per-day picture plus the
 * comparison with last week.
 *
 * Each session is attributed to the day it started on; a session running
 * past midnight is clipped at 24:00 on the timeline (its full duration still
 * counts toward the day's hours).
 */
export function weekSummary(sessions, now = new Date()) {
  const weekStart = startOfWeek(now).getTime()
  const lastWeekStart = weekStart - 7 * DAY_MS
  const todayIndex = Math.floor((startOfDay(now) - weekStart) / DAY_MS)

  const days = DAY_LABELS.map((label, i) => ({
    label,
    index: i,
    date: new Date(weekStart + i * DAY_MS),
    isToday: i === todayIndex,
    isFuture: i > todayIndex,
    hours: 0,
    spans: [],
  }))

  let lastWeekHours = 0
  const games = new Set()
  let sessionCount = 0

  for (const s of sessions || []) {
    if (!s?.started_at) continue
    const startMs = s.started_at * 1000
    const hours = Math.max(0, (s.duration_sec ?? 0) / 3600)
    if (startMs >= weekStart && startMs < weekStart + 7 * DAY_MS) {
      const i = Math.floor((startMs - weekStart) / DAY_MS)
      const dayStart = weekStart + i * DAY_MS
      const endMs = s.ended_at ? s.ended_at * 1000 : startMs + hours * 3_600_000
      days[i].hours += hours
      days[i].spans.push({
        start: hoursOfDay(startMs, dayStart),
        end: hoursOfDay(endMs, dayStart),
        game: s.game_name || 'Unknown game',
        sessionId: s.session_id,
      })
      games.add(s.game_name)
      sessionCount += 1
    } else if (startMs >= lastWeekStart && startMs < weekStart) {
      lastWeekHours += hours
    }
  }

  const total = days.reduce((sum, d) => sum + d.hours, 0)
  return {
    weekStart: new Date(weekStart),
    days,
    total,
    playDays: days.filter((d) => d.hours > 0).length,
    elapsedDays: Math.min(7, todayIndex + 1),
    gameCount: games.size,
    sessionCount,
    lastWeekTotal: lastWeekHours,
    // null when there is nothing to compare against — never "+∞%".
    deltaPct:
      lastWeekHours > 0 ? Math.round(((total - lastWeekHours) / lastWeekHours) * 100) : null,
  }
}

/** Per-game hours for this week and last week: Map(game_name → {thisWeek, lastWeek}). */
export function weeklyByGame(sessions, now = new Date()) {
  const weekStart = startOfWeek(now).getTime()
  const lastWeekStart = weekStart - 7 * DAY_MS
  const out = new Map()
  for (const s of sessions || []) {
    if (!s?.started_at || !s.game_name) continue
    const startMs = s.started_at * 1000
    const hours = Math.max(0, (s.duration_sec ?? 0) / 3600)
    const row = out.get(s.game_name) ?? { thisWeek: 0, lastWeek: 0 }
    if (startMs >= weekStart) row.thisWeek += hours
    else if (startMs >= lastWeekStart) row.lastWeek += hours
    out.set(s.game_name, row)
  }
  return out
}

/** 'up' | 'down' | 'flat' — a 10% dead band keeps small wobbles "flat". */
export function trendOf(thisWeek, lastWeek) {
  if (thisWeek > lastWeek * 1.1 && thisWeek - lastWeek >= 0.1) return 'up'
  if (thisWeek < lastWeek * 0.9 && lastWeek - thisWeek >= 0.1) return 'down'
  return 'flat'
}

function startOfDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}
