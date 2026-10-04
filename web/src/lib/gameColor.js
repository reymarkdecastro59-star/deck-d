// A stable identity colour per game, used where art can't be shown at full
// size (week timeline blocks, legends). Prefers the art's dominant colour once
// the backend provides it (task B11); until then a deterministic muted hue
// derived from the name, tuned to sit beside cover art without competing.

export function hueOf(name) {
  let h = 0
  for (const ch of String(name || '')) h = (h * 31 + ch.codePointAt(0)) >>> 0
  return h % 360
}

export function gameColor(game) {
  const dominant = game?.dominant_color
  if (typeof dominant === 'string' && /^#[0-9a-f]{6}$/i.test(dominant)) return dominant
  const name = typeof game === 'string' ? game : game?.game || game?.game_name
  return `hsl(${hueOf(name)} 34% 38%)`
}
