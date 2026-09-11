// Turn a flat session list into 7 day-buckets ending today, expressed as hours.
// Sessions are keyed to the day their started_at falls on in the user's local TZ,
// which is the calendar the user actually thinks in when reading "this week".
const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export function weeklyBuckets(sessions, now = new Date()) {
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const buckets = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - (6 - i))
    return { date: d, label: DAY_LABELS[d.getDay()], value: 0 }
  })
  const firstDay = buckets[0].date.getTime()
  const lastDayEnd = today.getTime() + 24 * 60 * 60 * 1000

  for (const s of sessions) {
    const started = s.started_at * 1000
    if (started < firstDay || started >= lastDayEnd) continue
    const startedDate = new Date(started)
    startedDate.setHours(0, 0, 0, 0)
    const idx = Math.round((startedDate.getTime() - firstDay) / (24 * 60 * 60 * 1000))
    if (idx >= 0 && idx < 7) {
      buckets[idx].value += s.duration_sec / 3600
    }
  }
  return buckets
}
