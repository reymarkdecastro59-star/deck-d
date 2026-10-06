// One reversible clock for camera, geometry, DOM, navigation and QA.
export const PHASES = Object.freeze({
  home: [0, 0.16],
  about: [0.16, 0.33],
  how: [0.33, 0.63],
  features: [0.63, 0.88],
  contact: [0.88, 1],
})
export const PHASE_ORDER = Object.keys(PHASES)
export const TRANSITIONS = {
  UNBIND: [0.13, 0.22],
  EXTRACTION: [0.32, 0.39],
  RECOMPOSITION: [0.55, 0.605],
  RESOLVE: [0.825, 0.92],
}
export const SECTION_FADES = {
  home: [0, 0, 0.13, 0.16],
  about: [0.16, 0.19, 0.31, 0.33],
  how: [0.33, 0.355, 0.595, 0.63],
  features: [0.63, 0.65, 0.875, 0.89],
  contact: [0.92, 0.945, 1, 1],
}
export const NAV_POINTS = { home: 0, about: 0.25, how: 0.375, features: 0.655, contact: 0.97 }
export const FEATURE_BEATS = [
  {
    id: 'library',
    start: 0.63,
    end: 0.68,
    title: 'Unified Library',
    copy: 'All your games in one place.',
    lines: ['All your games.', 'One place.'],
  },
  {
    id: 'playtime',
    start: 0.68,
    end: 0.73,
    title: 'Playtime Insights',
    copy: 'See where your time goes.',
    lines: ['See where', 'your time goes.'],
  },
  {
    id: 'recommendations',
    start: 0.73,
    end: 0.78,
    title: 'Smart Recommendations',
    copy: 'Discover what fits next.',
    lines: ['Your habits.', 'Your next game.'],
  },
  {
    id: 'platforms',
    start: 0.78,
    end: 0.83,
    title: 'Cross-Platform Support',
    copy: 'Connect your favorite launchers.',
    lines: ['Different launchers.', 'One library.'],
  },
  {
    id: 'customize',
    start: 0.83,
    end: 0.88,
    title: 'Clean & Customizable',
    copy: 'A layout that feels like yours.',
    lines: ['Make it yours.'],
  },
]
export const QA_POINTS = {
  home: 0.04,
  'home-separation': 0.11,
  'card-pass': 0.175,
  about: 0.285,
  'library-depth': 0.3,
  extraction: 0.35,
  track: 0.375,
  'track-understand': 0.436,
  understand: 0.445,
  'understand-recommend': 0.49,
  recommend: 0.515,
  docking: 0.595,
  features: 0.655,
  library: 0.66,
  playtime: 0.705,
  recommendations: 0.755,
  platforms: 0.805,
  customize: 0.855,
  resolve: 0.915,
  contact: 0.97,
}
export const clamp01 = (n) => Math.max(0, Math.min(1, n))
export const smoothstep = (n) => {
  const t = clamp01(n)
  return t * t * (3 - 2 * t)
}
export const lerp = (a, b, t) => a + (b - a) * t
export const interval = (p, a, b) => smoothstep((p - a) / (b - a))
// Disjoint, reversible ownership: an outgoing subject clears before the next enters.
export function lifecycle(p, start, end, ramp = 0.006) {
  if (p <= start || p >= end) return { phase: 'INACTIVE', opacity: 0 }
  const opacity = interval(p, start, start + ramp) * (1 - interval(p, end - ramp, end))
  return { phase: p < start + ramp ? 'ENTER' : p > end - ramp ? 'EXIT' : 'ACTIVE', opacity }
}
export function featureLifecycle(p, index) {
  const beat = FEATURE_BEATS[index]
  return lifecycle(p, beat.start, beat.end)
}
export const phaseIndex = (p) => (p < 0.16 ? 0 : p < 0.33 ? 1 : p < 0.63 ? 2 : p < 0.88 ? 3 : 4)
export function progressInPhase(p, key) {
  const [a, b] = PHASES[key]
  return clamp01((p - a) / (b - a))
}
export function transitionProgress(p, key) {
  const [a, b] = TRANSITIONS[key]
  return clamp01((p - a) / (b - a))
}
export const easedTransition = (p, key) => smoothstep(transitionProgress(p, key))
export function sample(p, frames) {
  if (p <= frames[0][0]) return frames[0].slice(1)
  for (let i = 1; i < frames.length; i++)
    if (p <= frames[i][0]) {
      const t = interval(p, frames[i - 1][0], frames[i][0])
      return frames[i].slice(1).map((v, j) => lerp(frames[i - 1][j + 1], v, t))
    }
  return frames[frames.length - 1].slice(1)
}
