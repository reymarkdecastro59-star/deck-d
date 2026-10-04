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

const ROUTES = {
  '/dashboard': () => ({
    total_sessions: sessions().length,
    total_hours: 323.0,
    games: GAMES.map(([game, total, decay, id]) => ({
      game,
      rawg_id: 900000 + id,
      slug: game.toLowerCase().replace(/\W+/g, '-'),
      background_image: null,
      total_hours: total,
      decay_hours: decay,
    })),
  }),
  '/sessions': () => ({ sessions: sessions() }),
  '/devices': () => ({
    devices: [
      { device_id: 'Desktop', device_name: 'Desktop', last_seen: now() - 2 * H },
      { device_id: 'Laptop', device_name: 'Laptop', last_seen: now() - 30 * H },
    ],
  }),
  '/recommendations': () => ({
    trending: [],
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
