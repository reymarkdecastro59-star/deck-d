import { test } from 'node:test'
import assert from 'node:assert/strict'
import { startOfWeek, weekSummary, weeklyByGame, trendOf } from './week.js'
import { gameState, lastPlayedByGame } from './gameState.js'
import { pickInsight } from './insights.js'
import { gameColor, hueOf } from './gameColor.js'

// Sunday 4 Oct 2026, 21:30 local.
const NOW = new Date(2026, 9, 4, 21, 30)
const at = (y, m, d, h, min = 0) => Math.floor(new Date(y, m, d, h, min).getTime() / 1000)
const session = (start, minutes, game, id = `${game}-${start}`) => ({
  session_id: id,
  game_name: game,
  started_at: start,
  ended_at: start + minutes * 60,
  duration_sec: minutes * 60,
})

test('startOfWeek is the local Monday at midnight', () => {
  const mon = startOfWeek(NOW)
  assert.equal(mon.getDay(), 1)
  assert.equal(mon.getDate(), 28) // Mon 28 Sep 2026
  assert.equal(mon.getHours(), 0)
})

test('weekSummary buckets hours by start day and compares with last week', () => {
  const sessions = [
    session(at(2026, 8, 28, 22), 84, 'Slay the Spire'), // Mon
    session(at(2026, 8, 29, 19, 30), 132, 'Hades II'), // Tue
    session(at(2026, 9, 4, 14), 66, 'Balatro'), // Sun (today)
    session(at(2026, 8, 22, 20), 120, 'Hades II'), // last week
  ]
  const w = weekSummary(sessions, NOW)
  assert.equal(w.days.length, 7)
  assert.equal(w.days[0].hours.toFixed(1), '1.4')
  assert.equal(w.days[2].hours, 0)
  assert.ok(w.days[6].isToday)
  assert.equal(w.playDays, 3)
  assert.equal(w.gameCount, 3)
  assert.equal(w.sessionCount, 3)
  assert.equal(w.total.toFixed(1), '4.7')
  assert.equal(w.lastWeekTotal, 2)
  assert.equal(w.deltaPct, 135)
  assert.deepEqual(w.days[6].spans[0].game, 'Balatro')
  assert.equal(w.days[6].spans[0].start, 14)
})

test('weekSummary returns null delta when last week is empty', () => {
  const w = weekSummary([session(at(2026, 9, 1, 20), 60, 'Tunic')], NOW)
  assert.equal(w.deltaPct, null)
})

test('a session past midnight is clipped at 24:00 on its start day', () => {
  const w = weekSummary([session(at(2026, 9, 2, 23), 120, 'Hades II')], NOW)
  const span = w.days[4].spans[0]
  assert.equal(span.start, 23)
  assert.equal(span.end, 24)
  assert.equal(w.days[4].hours, 2)
})

test('weeklyByGame and trendOf', () => {
  const m = weeklyByGame(
    [session(at(2026, 9, 3, 20), 120, 'Hades II'), session(at(2026, 8, 25, 20), 60, 'Hades II')],
    NOW
  )
  assert.deepEqual(m.get('Hades II'), { thisWeek: 2, lastWeek: 1 })
  assert.equal(trendOf(2, 1), 'up')
  assert.equal(trendOf(1, 2), 'down')
  assert.equal(trendOf(1.02, 1), 'flat')
  assert.equal(trendOf(0, 0), 'flat')
})

test('gameState thresholds', () => {
  const now = NOW.getTime()
  assert.equal(gameState(at(2026, 9, 3, 12), now), 'active')
  assert.equal(gameState(at(2026, 8, 20, 12), now), 'drifting')
  assert.equal(gameState(at(2026, 7, 1, 12), now), 'dormant')
  assert.equal(gameState(null, now), 'dormant')
})

test('lastPlayedByGame keeps the latest start', () => {
  const m = lastPlayedByGame([session(100, 1, 'A'), session(300, 1, 'A'), session(200, 1, 'B')])
  assert.equal(m.get('A'), 300)
  assert.equal(m.get('B'), 200)
})

test('pickInsight finds short bursts first', () => {
  const rows = Array.from({ length: 6 }, (_, i) => session(at(2026, 9, 1 + (i % 3), 13 + i), 30, 'Balatro'))
  const hit = pickInsight(rows, NOW.getTime())
  assert.equal(hit.id, 'short-bursts')
  assert.match(hit.text, /Balatro in short bursts: 6 sessions/)
  assert.equal(hit.bars.length, 6)
})

test('pickInsight falls back to evenings, then null', () => {
  const evening = Array.from({ length: 6 }, (_, i) => session(at(2026, 9, 1, 19) - i * 86_400, 70, `G${i}`))
  assert.equal(pickInsight(evening, NOW.getTime()).id, 'evenings')
  assert.equal(pickInsight([], NOW.getTime()), null)
})

test('gameColor prefers a valid dominant colour, else a stable hue', () => {
  assert.equal(gameColor({ dominant_color: '#112233' }), '#112233')
  assert.equal(gameColor({ dominant_color: 'red;}' , game: 'X' }), `hsl(${hueOf('X')} 34% 38%)`)
  assert.equal(gameColor('Hades II'), gameColor({ game: 'Hades II' }))
})
