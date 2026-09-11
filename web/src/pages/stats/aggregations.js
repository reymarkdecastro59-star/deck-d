// Client-side aggregations over the raw session list. These are additive
// (raw_sum style) — they do NOT strip cross-device overlap. The union-math
// numbers on the Stats page come from the /dashboard endpoint; these views
// are for shape (when you play, what you label, how long each session runs)
// where naive sums are what the eye actually wants.

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const DAY_LONG = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/**
 * dailyBuckets(sessions, days, now) → [{ date, label, value }] of length `days`,
 * ending on the day of `now`. Value is hours played that day.
 */
export function dailyBuckets(sessions, days, now = new Date()) {
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const buckets = Array.from({ length: days }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - (days - 1 - i))
    return { date: d, label: DAY_LABELS[d.getDay()], value: 0 }
  })
  const firstDay = buckets[0].date.getTime()
  const dayMs = 24 * 60 * 60 * 1000
  const lastDayEnd = today.getTime() + dayMs

  for (const s of sessions) {
    const started = s.started_at * 1000
    if (started < firstDay || started >= lastDayEnd) continue
    const startedDate = new Date(started)
    startedDate.setHours(0, 0, 0, 0)
    const idx = Math.round((startedDate.getTime() - firstDay) / dayMs)
    if (idx >= 0 && idx < days) buckets[idx].value += s.duration_sec / 3600
  }
  return buckets
}

/**
 * hourOfDayMatrix(sessions) → 7×24 matrix of hours played bucketed by weekday
 * and hour-of-day (local TZ). Sessions that span multiple hours are attributed
 * to their start hour — approximate but readable, and the alternative (splitting
 * each session across cells) inflates cell counts in a way that hides the real
 * pattern.
 */
export function hourOfDayMatrix(sessions) {
  const rows = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0))
  for (const s of sessions) {
    const d = new Date(s.started_at * 1000)
    rows[d.getDay()][d.getHours()] += s.duration_sec / 3600
  }
  return rows
}

/**
 * labelBreakdown(sessions) → sorted array of { label, hours, count } summed
 * additively. Rounds hours to 0.1 for display. Empty labels bucket into
 * 'tracked' so the palette color still applies.
 */
export function labelBreakdown(sessions) {
  const acc = new Map()
  for (const s of sessions) {
    const key = s.label || 'tracked'
    const row = acc.get(key) || { label: key, hours: 0, count: 0 }
    row.hours += s.duration_sec / 3600
    row.count += 1
    acc.set(key, row)
  }
  return Array.from(acc.values()).sort((a, b) => b.hours - a.hours)
}

/**
 * sessionLengthBuckets(sessions) → histogram of session duration into six
 * fixed buckets. The buckets are chosen to be human-readable at a glance
 * (short break, quick session, focused hour, long haul, marathon).
 */
const LENGTH_BUCKETS = [
  { label: '<15m', min: 0, max: 15 * 60 },
  { label: '15–30m', min: 15 * 60, max: 30 * 60 },
  { label: '30–60m', min: 30 * 60, max: 60 * 60 },
  { label: '1–2h', min: 60 * 60, max: 120 * 60 },
  { label: '2–4h', min: 120 * 60, max: 240 * 60 },
  { label: '4h+', min: 240 * 60, max: Infinity },
]

export function sessionLengthBuckets(sessions) {
  const buckets = LENGTH_BUCKETS.map((b) => ({ label: b.label, value: 0 }))
  for (const s of sessions) {
    const idx = LENGTH_BUCKETS.findIndex((b) => s.duration_sec >= b.min && s.duration_sec < b.max)
    if (idx >= 0) buckets[idx].value += 1
  }
  return buckets
}

/**
 * quickStats(sessions) → derived scalars used in the KPI strip. All additive
 * (no union) — they describe the shape of the raw session list.
 */
export function quickStats(sessions) {
  if (sessions.length === 0) {
    return {
      count: 0,
      totalHours: 0,
      avgMinutes: 0,
      medianMinutes: 0,
      longest: null,
      activeDays: 0,
    }
  }
  const durations = sessions.map((s) => s.duration_sec).sort((a, b) => a - b)
  const totalSec = durations.reduce((a, b) => a + b, 0)
  const avg = totalSec / durations.length
  const mid = Math.floor(durations.length / 2)
  const median = durations.length % 2 ? durations[mid] : (durations[mid - 1] + durations[mid]) / 2
  const longest = sessions.reduce(
    (best, s) => (s.duration_sec > (best?.duration_sec ?? 0) ? s : best),
    null
  )

  const daySet = new Set()
  for (const s of sessions) {
    const d = new Date(s.started_at * 1000)
    d.setHours(0, 0, 0, 0)
    daySet.add(d.getTime())
  }

  return {
    count: sessions.length,
    totalHours: totalSec / 3600,
    avgMinutes: avg / 60,
    medianMinutes: median / 60,
    longest,
    activeDays: daySet.size,
  }
}

/**
 * filterByRange(sessions, window) → subset of sessions started within the
 * inclusive window. Passing null returns the full list (all-time).
 */
export function filterByRange(sessions, window) {
  if (!window) return sessions
  return sessions.filter((s) => s.started_at >= window.from && s.started_at <= window.to)
}

export const WEEKDAY_LABELS = DAY_LABELS
export const WEEKDAY_LONG = DAY_LONG
