import { CanvasTexture, SRGBColorSpace } from 'three'
export function makeTexture(width, height, draw) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  draw(ctx, width, height)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 4
  return texture
}
export function text(ctx, label, x, y, size = 24, color = '#e9eef7', weight = 400) {
  ctx.fillStyle = color
  ctx.font = `${weight} ${size}px Inter, Arial, sans-serif`
  ctx.fillText(label, x, y)
}
export function round(ctx, x, y, w, h, r = 12, fill = '#111e30', stroke = '#34475e') {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
  ctx.fillStyle = fill
  ctx.fill()
  if (stroke) {
    ctx.strokeStyle = stroke
    ctx.lineWidth = 1
    ctx.stroke()
  }
}
// Authored product states reuse the approved dashboard and cover assets.
// Precomputed once; scroll only crossfades their materials.
export function dashboardState(base, kind) {
  return makeTexture(1200, 840, (c) => {
    c.drawImage(base.image, 0, 0)
    if (kind === 'playtime') {
      c.fillStyle = '#101b2c'
      c.fillRect(214, 84, 986, 350)
      text(c, 'Playtime this week', 252, 130, 29, '#f5f7fb', 600)
      text(c, '23h', 252, 209, 52, '#edf2f8', 600)
      text(c, 'Across your recently played games', 252, 243, 16, '#95a6bd')
      const values = [38, 72, 55, 108, 150, 128, 176]
      values.forEach((v, i) => {
        round(c, 616 + i * 70, 365 - v, 37, v, 4, '#69849e', null)
        text(c, ['M', 'T', 'W', 'T', 'F', 'S', 'S'][i], 628 + i * 70, 393, 15, '#95a6bd')
      })
      text(c, 'ELDEN RING', 252, 310, 14, '#95a6bd')
      text(c, '12h', 252, 349, 30)
      text(c, 'Most played this week', 252, 384, 16, '#95a6bd')
    } else if (kind === 'recommendations') {
      c.fillStyle = 'rgba(7, 12, 21, .46)'
      c.fillRect(214, 84, 986, 350)
      round(c, 246, 496, 260, 272, 12, '#17273b', '#71879d')
      // Keep the physical Hades card's established docking slot clear.
      text(c, 'Hades', 265, 728, 19)
      text(c, 'Fast runs. Lasting progression.', 265, 751, 13, '#bac8d8')
      text(c, 'BASED ON YOUR PLAY', 843, 475, 13, '#aebed0')
    } else if (kind === 'customize') {
      c.fillStyle = '#101b2c'
      c.fillRect(214, 84, 986, 350)
      text(c, 'Recently Played', 252, 130, 29, '#f5f7fb', 600)
      text(c, 'COMPACT VIEW', 940, 129, 13, '#aebed0')
      for (let i = 0; i < 3; i++) {
        const y = 157 + i * 86
        round(c, 252, y, 810, 74, 7, '#0b1422', '#24334a')
        c.drawImage(base.image, 313 + i * 278, 163, 126, 189, 262, y + 5, 43, 64)
        text(c, ['Elden Ring', 'Cyberpunk 2077', 'Baldur’s Gate 3'][i], 326, y + 32, 20)
        text(c, ['12h this week', '8h this week', '3h this week'][i], 326, y + 56, 14, '#95a6bd')
      }
    }
  })
}
export function uiTexture(kind, images = []) {
  return makeTexture(
    kind === 'dashboard' ? 1200 : 800,
    kind === 'dashboard' ? 840 : 460,
    (c, w, h) => {
      const g = c.createLinearGradient(0, 0, w, h)
      g.addColorStop(0, '#142136')
      g.addColorStop(1, '#080e18')
      c.fillStyle = g
      c.fillRect(0, 0, w, h)
      if (kind === 'dashboard') {
        c.fillStyle = '#090f19'
        c.fillRect(0, 0, w, 84)
        c.fillRect(0, 84, 214, h - 84)
        c.fillStyle = '#eef4ff'
        c.beginPath()
        c.arc(37, 42, 12, 0, Math.PI * 2)
        c.fill()
        text(c, "DECK'D", 60, 52, 26, '#f5f7fb', 700)
        text(c, 'YOUR LIBRARY', 252, 52, 16, '#8a9ab1')
        text(c, 'PRODUCT PREVIEW · SAMPLE DATA', 810, 52, 13, '#8a9ab1')
        const labels = ['Library', 'Recent sessions', 'Recommendations', 'Playtime', 'Devices']
        labels.forEach((s, i) => {
          if (!i) round(c, 15, 115 + i * 62, 184, 47, 7, '#1b2a44', null)
          text(c, s, 36, 146 + i * 62, 17, i ? '#8797ae' : '#f7f9ff')
        })
        text(c, 'Recently Played', 252, 130, 29, '#f5f7fb', 600)
        images.slice(0, 3).forEach((img, i) => {
          const x = 252 + i * 278
          round(c, x, 158, 248, 257, 10, '#0a111e', '#24334a')
          c.save()
          c.beginPath()
          c.roundRect(x + 5, 163, 238, 189, 6)
          c.clip()
          // Keep the library readable while the matching physical cover arrives.
          c.drawImage(img, x + 61, 163, 126, 189)
          c.restore()
          text(c, ['Elden Ring', 'Cyberpunk 2077', 'Baldur’s Gate 3'][i], x + 13, 383, 19)
          text(c, ['12h this week', '8h this week', '3h this week'][i], x + 13, 405, 13, '#8698b2')
        })
        text(c, 'Recommended for You', 252, 476, 28, '#f5f7fb', 600)
        // The empty first slot is filled by the SAME 3D recommendation mesh.
        round(c, 252, 502, 248, 260, 10, '#0b1422', '#344962')
        text(c, 'Hades', 265, 728, 19)
        text(c, 'Fast runs. Lasting progression.', 265, 751, 13, '#9bafca')
        images.slice(4, 6).forEach((img, i) => {
          const x = 530 + i * 278
          round(c, x, 502, 248, 260, 10, '#0b1422', '#24334a')
          const artHeight = 196
          const artWidth = (artHeight * img.width) / img.height
          c.drawImage(img, x + (248 - artWidth) / 2, 507, artWidth, artHeight)
          text(c, ['Stardew Valley', 'Hollow Knight'][i], x + 13, 730, 19)
          text(c, 'Picked around your play patterns', x + 13, 752, 12, '#879bb4')
        })
        text(c, 'Connected launchers: Steam · Epic Games · GOG · Xbox', 252, 813, 15, '#8d9eb4')
      } else if (kind.startsWith('platform:')) {
        c.clearRect(0, 0, w, h)
        c.textAlign = 'center'
        text(
          c,
          kind.split(':')[1] === 'Epic' ? 'EPIC GAMES' : kind.split(':')[1],
          400,
          265,
          102,
          '#eff5ff',
          600
        )
      } else if (kind.startsWith('launcher:')) {
        text(c, kind.split(':')[1], 40, 90, 42, '#f0f4fc', 600)
        text(c, 'CONNECTED LIBRARY', 40, 137, 18, '#91a6c0')
        ;['Your games', 'Recent activity', 'Playtime'].forEach((s, i) => {
          round(c, 38, 170 + i * 79, 724, 62, 8, '#1a2940')
          text(c, s, 60, 210 + i * 79, 24)
        })
      } else if (kind === 'ribbon') {
        c.clearRect(0, 0, w, h)
        text(c, 'PLAYTIME / THIS WEEK', 40, 190, 28, '#94a9c4')
        text(c, '24h 18m', 40, 288, 78, '#e6eefb', 500)
      } else if (kind === 'brand-hub') {
        c.clearRect(0, 0, w, h)
        c.textAlign = 'center'
        text(c, "DECK'D", 400, 245, 164, '#e1e8f5', 700)
        text(c, 'LIBRARY', 400, 336, 54, '#a6b6cd', 500)
      } else if (kind === 'brand') {
        c.clearRect(0, 0, w, h)
        c.fillStyle = '#e1e8f5'
        c.beginPath()
        c.arc(400, 166, 42, 0, Math.PI * 2)
        c.fill()
        c.textAlign = 'center'
        text(c, "DECK'D", 400, 305, 64, '#e1e8f5', 700)
      } else {
        const titles = {
          track: 'Track',
          understand: 'Understand',
          recommend: 'Recommend',
          session: 'ELDEN RING',
          layers: 'Your library',
          custom: 'Make it yours',
        }
        const n = { track: '01', understand: '02', recommend: '03' }
        text(c, n[kind] || 'DECK’D', 40, 64, 20, '#8c9fb8', 500)
        text(c, titles[kind] || kind, 40, 125, 46, '#f0f4fc', 600)
        if (kind === 'track' || kind === 'session') {
          text(c, 'Elden Ring', 42, 191, 25)
          text(c, 'Steam · Action RPG', 42, 224, 18, '#a0aec1')
          text(c, '2h 14m', 42, 302, 48, '#eef4ff', 500)
          text(c, 'LAST SESSION · TODAY', 42, 335, 15, '#90a3bb')
          for (let i = 0; i < 7; i++)
            round(
              c,
              415 + i * 43,
              345 - [60, 94, 77, 132, 178, 155, 205][i],
              25,
              [60, 94, 77, 132, 178, 155, 205][i],
              4,
              '#53769e',
              null
            )
          text(c, 'M     T     W     T     F     S     S', 408, 385, 15, '#94a7c0')
        } else if (kind === 'understand') {
          text(c, 'Your play has a pattern.', 42, 190, 23, '#a5b6cb')
          const labels = ['Action RPG', 'Exploration', 'Short sessions']
          const lengths = [300, 224, 142]
          labels.forEach((s, i) => {
            text(c, s, 42, 254 + i * 59, 18)
            round(c, 257, 236 + i * 59, lengths[i], 14, 7, '#6685ae', null)
          })
          c.strokeStyle = '#536f95'
          c.lineWidth = 18
          c.beginPath()
          c.arc(674, 255, 64, -1.57, 3.2)
          c.stroke()
          text(c, '72%', 630, 267, 32)
        } else if (kind === 'recommend') {
          text(c, 'Built around what you enjoy.', 42, 190, 23, '#a5b6cb')
          text(c, 'Fast runs', 42, 264, 22)
          text(c, 'Progression', 42, 310, 22)
          text(c, 'One more try', 42, 356, 22)
          text(c, 'YOUR NEXT GAME', 430, 267, 18, '#91a5c0')
          text(c, 'Hades', 430, 325, 54, '#f1f5fc', 600)
        } else {
          ;['Library', 'Recent sessions', 'Playtime insights'].forEach((s, i) => {
            round(c, 38, 170 + i * 79, 724, 62, 8, '#1a2940')
            text(c, s, 60, 210 + i * 79, 24)
          })
        }
      }
    }
  )
}
