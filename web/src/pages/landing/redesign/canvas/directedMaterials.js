import { makeTexture, text, round } from './sceneTextures'

// Sample product UI, rendered once. Meshes, camera and timings are shared with previs.
export function panelTexture(kind) {
  return makeTexture(1024, 480, (c) => {
    c.fillStyle = '#101923'
    c.fillRect(0, 0, 1024, 480)
    const titles = {
      track: 'Track',
      understand: 'Understand',
      recommend: 'Recommend',
      library: 'Your library',
      playtime: 'Playtime insights',
      next: 'Your next game',
    }
    text(c, titles[kind], 42, 72, 36, '#edf0f4', 600)
    text(c, 'DECK’D  /  SAMPLE DATA', 720, 65, 15, '#93a0ae')
    if (kind === 'track' || kind === 'playtime') {
      text(c, kind === 'track' ? 'Elden Ring' : 'This week', 42, 144, 25)
      text(c, kind === 'track' ? '2h 14m' : '23h', 42, 260, 72, '#f3f3f3', 500)
      text(c, kind === 'track' ? 'LAST SESSION' : 'TOTAL PLAYTIME', 45, 303, 16, '#93a0ae')
      const values = [0.24, 0.42, 0.33, 0.6, 0.8, 0.65, 0.94]
      values.forEach((v, i) => {
        round(c, 420 + i * 76, 370 - v * 230, 39, v * 230, 4, '#789494', null)
        text(c, ['M', 'T', 'W', 'T', 'F', 'S', 'S'][i], 428 + i * 76, 415, 17, '#a1acb9')
      })
    } else if (kind === 'understand') {
      text(c, '72%', 42, 260, 92, '#e9eeee', 500)
      text(c, 'OF YOUR PLAYTIME IN RPGs', 45, 313, 17, '#93a0ae')
      ;[
        ['RPG', 0.72],
        ['Action', 0.19],
        ['Other', 0.09],
      ].forEach(([label, v], i) => {
        text(c, label, 480, 160 + i * 92, 23)
        round(c, 480, 180 + i * 92, 440, 13, 5, '#29323d', null)
        round(c, 480, 180 + i * 92, 440 * v, 13, 5, '#91a7a7', null)
      })
    } else if (kind === 'recommend') {
      text(c, 'Built around your play', 42, 161, 29)
      text(c, 'Strong progression. Memorable worlds.', 42, 226, 25, '#a8b6c3')
      text(c, 'THREE CANDIDATES BELOW', 42, 373, 17, '#91a7a7')
    } else if (kind === 'selected') {
      text(c, 'YOUR NEXT GAME', 42, 144, 23, '#91a7a7')
      text(c, 'Hades', 42, 273, 78, '#eef2f4', 600)
      text(c, 'A new run. A familiar sense of progression.', 42, 378, 24, '#a8b6c3')
    } else if (kind === 'next') {
      // Keep the right half physically open for the same Hades mesh.
      text(c, 'Hades', 42, 165, 48, '#f1f3f5', 600)
      text(c, 'Fast runs.', 42, 231, 24, '#a8b6c3')
      text(c, 'Lasting progression.', 42, 270, 24, '#a8b6c3')
      text(c, 'BASED ON YOUR PLAY', 42, 408, 17, '#91a7a7')
    } else {
      text(c, 'RECENTLY PLAYED', 42, 137, 20, '#a8b6c3')
    }
  })
}
