// URL-safe key for a game row. Prefers rawg_id (stable across renames) and
// falls back to a slug of the display name. Kept in one place so route params
// and card links can't drift apart.
export function gameKey(game) {
  if (!game) return ''
  if (game.rawg_id != null) return `rawg-${game.rawg_id}`
  if (game.slug) return game.slug
  return slugify(game.game || 'unknown')
}

export function slugify(str) {
  return (
    String(str)
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'game'
  )
}

// Matches a game row against a URL param key. Handles rawg- prefix, slug
// equality, and slugified-name equality (for games without RAWG metadata).
export function matchesKey(game, key) {
  if (!game || !key) return false
  if (key.startsWith('rawg-') && game.rawg_id != null) {
    return String(game.rawg_id) === key.slice(5)
  }
  if (game.slug && game.slug === key) return true
  return slugify(game.game) === key
}
