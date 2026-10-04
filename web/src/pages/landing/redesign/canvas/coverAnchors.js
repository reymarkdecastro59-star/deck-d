function clamp01(value) {
  return Math.min(1, Math.max(0, value))
}

export function computeCoverAnchor(index, phaseKey) {
  const column = index % 3
  const row = Math.floor(index / 3)
  const fanOffset = index - 4
  const angle = (index / 9) * Math.PI * 2 - Math.PI / 2

  switch (phaseKey) {
    case 'home':
      return { x: fanOffset * 0.08, y: fanOffset * 0.025, z: -index * 0.02 }
    case 'about':
      return { x: (column - 1) * 1.4, y: (1 - row) * 2.1, z: -0.2 }
    case 'how':
      return { x: (column - 1) * 1.8, y: (1 - row) * 1.6, z: -0.4 }
    case 'features':
      return { x: (column - 1) * 1.0, y: 0.3 + (1 - row) * 1.0, z: -0.25 }
    case 'contact':
      return {
        x: Math.cos(angle) * 3.4,
        y: Math.sin(angle) * 3.4,
        z: 4.8 + (index % 3) * 0.18,
      }
    default:
      return { x: 0, y: 0, z: 0 }
  }
}

export function lerpAnchor(fromKey, toKey, index, t) {
  const from = computeCoverAnchor(index, fromKey)
  const to = computeCoverAnchor(index, toKey)
  const progress = clamp01(t)

  return {
    x: from.x + (to.x - from.x) * progress,
    y: from.y + (to.y - from.y) * progress,
    z: from.z + (to.z - from.z) * progress,
  }
}
