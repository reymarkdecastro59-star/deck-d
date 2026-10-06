const TIER_SIZE = 3

const LAST_PLAYED = {
  active: ['2 hours ago', '5 hours ago', 'yesterday'],
  drifting: ['3 days ago', '8 days ago', '12 days ago'],
  abandoned: ['4 weeks ago', '5 weeks ago', '2 months ago'],
}

const REASON_BUILDERS = [
  (title) => `Similar to ${title}`,
  (title) => `Same pacing as ${title}`,
  (title) => `Pairs well with ${title}`,
]

function slugHash(slug) {
  let hash = 2166136261

  for (let index = 0; index < slug.length; index += 1) {
    hash ^= slug.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return hash >>> 0
}

function tierAt(index) {
  if (index < TIER_SIZE) return 'active'
  if (index < TIER_SIZE * 2) return 'drifting'
  return 'abandoned'
}

export function formatHours(hours) {
  const totalMinutes = Math.round(Math.max(0, hours) * 60)
  return `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`
}

export function buildDashboardRows(covers) {
  return covers.map((cover, index) => {
    const hash = slugHash(cover.slug)
    const tier = tierAt(index)
    const relatedOffset = 1 + (hash % Math.max(1, covers.length - 1))
    const related = covers[(index + relatedOffset) % covers.length]
    const hoursThisWeek =
      tier === 'active' ? 6 + (hash % 90) / 10 : tier === 'drifting' ? 0.3 + (hash % 27) / 10 : 0

    return {
      slug: cover.slug,
      title: cover.title,
      hoursThisWeek: Number(hoursThisWeek.toFixed(1)),
      hoursTotal: Number((24 + (hash % 1760) / 10).toFixed(1)),
      lastPlayed: LAST_PLAYED[tier][hash % LAST_PLAYED[tier].length],
      tier,
      recommendationReason: REASON_BUILDERS[index % REASON_BUILDERS.length](related.title),
    }
  })
}
