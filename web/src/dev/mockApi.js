// DEV-ONLY sample API for visual QA of signed-in screens without an account.
// Loaded only through the `import.meta.env.DEV` branch in api/client.js, so it
// is removed from production builds. All data is invented sample data.

const H = 3600
const now = () => Math.floor(Date.now() / 1000)

function mondayStart() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return Math.floor(d.getTime() / 1000)
}

// [dayOffsetFromMonday, startHour, minutes, game, device]
const THIS_WEEK = [
  [0, 22, 84, 'Slay the Spire', 'Desktop'],
  [1, 19.5, 132, 'Hades II', 'Desktop'],
  [3, 12.3, 66, 'Tunic', 'Laptop'],
  [3, 21, 30, 'Balatro', 'Laptop'],
  [4, 19.7, 102, 'Hades II', 'Desktop'],
  [5, 18.5, 45, 'Balatro', 'Laptop'],
  [5, 20.2, 88, 'Dave the Diver', 'Desktop'],
  [6, 14, 66, 'Balatro', 'Laptop'],
  [6, 9, 130, 'Hades II', 'Desktop'],
]
const LAST_WEEK = [
  [-6, 20, 95, 'Hades II', 'Desktop'],
  [-5, 21, 40, 'Balatro', 'Laptop'],
  [-4, 19, 120, 'Elden Ring', 'Desktop'],
  [-3, 13, 35, 'Balatro', 'Laptop'],
  [-2, 20, 70, 'Dave the Diver', 'Desktop'],
  [-1, 22, 38, 'Balatro', 'Laptop'],
  [-12, 20, 180, 'Elden Ring', 'Desktop'],
  [-20, 21, 30, 'Balatro', 'Laptop'],
  [-21, 13, 25, 'Balatro', 'Laptop'],
  [-22, 20, 40, 'Balatro', 'Laptop'],
  [-40, 20, 90, 'Celeste', 'Desktop'],
]

function sessions() {
  const mon = mondayStart()
  const t = now()
  return [...THIS_WEEK, ...LAST_WEEK]
    .map(([d, h, m, game, device], i) => {
      const started = Math.round(mon + d * 86_400 + h * H)
      return {
        session_id: `mock-${i}`,
        game_name: game,
        game_exe: `${game.toLowerCase().replace(/\W+/g, '')}.exe`,
        started_at: started,
        ended_at: started + m * 60,
        duration_sec: m * 60,
        label: 'tracked',
        device_id: device,
      }
    })
    .filter((s) => s.ended_at <= t)
    .sort((a, b) => b.started_at - a.started_at)
}

const GAMES = [
  ['Hades II', 42.1, 6.8, 1],
  ['Balatro', 31.6, 5.1, 2],
  ['Dave the Diver', 19.4, 3.6, 3],
  ['Slay the Spire', 88.0, 2.4, 4],
  ['Tunic', 9.3, 2.2, 5],
  ['Elden Ring', 118.4, 1.1, 6],
  ['Celeste', 14.2, 0.1, 7],
]

// Sample trending list (the real one is RAWG's daily list).
const TRENDING = [
  ['Hollow Knight: Silksong', ['Action', 'Platformer'], 91],
  ['Hades II', ['Action', 'Roguelike'], 94],
  ['Blue Prince', ['Puzzle', 'Strategy'], 92],
  ['Clair Obscur: Expedition 33', ['RPG'], 93],
  ['Ball x Pit', ['Action', 'Indie'], null],
  ['Megabonk', ['Action', 'Roguelike'], null],
  ['Dispatch', ['Adventure'], 84],
  ['Hades', ['Action', 'Roguelike'], 93],
].map(([name, genres, metacritic], i) => ({
  rawg_id: 800000 + i,
  rank: i + 1,
  chart_rank: i + 1,
  last_week_rank: [1, 3, 2, null, 5, 9, 7, 6][i],
  peak_players: [1293425, 895069, 412000, 210500, 98000, 87000, 61000, 45000][i],
  name,
  slug: name.toLowerCase().replace(/\W+/g, '-'),
  background_image: null,
  genres,
  metacritic,
}))

// One game known only from a Steam import (no tracked sessions yet).
const IMPORTED_ONLY = {
  game: 'Stardew Valley',
  rawg_id: null,
  slug: null,
  background_image: null,
  total_hours: 61.2,
  tracked_hours: 0,
  imported_hours: 61.2,
  imported_from: ['Steam'],
  decay_hours: 0,
}

const ROUTES = {
  '/dashboard': () => ({
    total_sessions: sessions().length,
    total_hours: 323.0,
    tracked_hours: 323.0,
    imported_hours: 61.2,
    games: [
      ...GAMES.map(([game, total, decay, id]) => ({
        game,
        rawg_id: 900000 + id,
        slug: game.toLowerCase().replace(/\W+/g, '-'),
        background_image: null,
        total_hours: total,
        tracked_hours: game === 'Hades II' ? 3.6 : total,
        ...(game === 'Hades II' ? { imported_hours: 42.1, imported_from: ['Steam'] } : {}),
        decay_hours: decay,
      })),
      IMPORTED_ONLY,
    ],
  }),
  '/sessions': () => ({ sessions: sessions() }),
  '/devices': () => ({
    devices: [
      { device_id: 'Desktop', device_name: 'Desktop', last_seen: now() - 2 * H },
      { device_id: 'Laptop', device_name: 'Laptop', last_seen: now() - 30 * H },
    ],
  }),
  '/recommendations': () => ({
    trending: TRENDING,
    genre_based: null,
    top_picks: [
      {
        name: 'Outer Wilds',
        slug: 'outer-wilds',
        background_image: null,
        metacritic: 85,
        reason:
          'You put most of this month into games built on curiosity and repeat runs. Outer Wilds rewards the same instinct, without the combat loop.',
      },
    ],
  }),
  '/imports': () => ({
    imports: [
      {
        source: 'steam',
        count: 22,
        total_hours: 158.5,
        imported_at: now() - 3 * H,
        account_label: 'Player',
      },
    ],
    requested_at: null,
  }),
  '/steam': () => ({ configured: true, link: null }),
  '/notifications': () => ({ notifications: [] }),
  '/profile': () => ({ profile: { email: 'player@example.com' } }),
  '/presence': () => ({
    presence: [{ game_name: 'Balatro', started_at: now() - 72 * 60, device_name: 'Desktop' }],
  }),
}

export async function mockFetch(path) {
  const key = Object.keys(ROUTES).find(
    (r) => path === r || path.startsWith(`${r}?`) || path.startsWith(`${r}/`)
  )
  await new Promise((r) => setTimeout(r, 250))
  if (key === '/presence' && !window.__DECKD_MOCK_LIVE__) return { presence: [] }
  if (!key) throw new Error(`mockApi: no fixture for ${path}`)
  return ROUTES[key]()
}
