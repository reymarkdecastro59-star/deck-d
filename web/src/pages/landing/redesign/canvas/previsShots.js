import { sample } from '../hooks/timelinePhases.js'

// The existing master scroll is the only clock. Holds and short rails are explicit.
export const PREVIS_SHOTS = [
  { id: '01', p: 0.05, start: 0, title: 'HOME — deck at rest', copy: 'Every game. One deck.' },
  {
    id: '02',
    p: 0.135,
    start: 0.1,
    title: 'HOME → ABOUT — separation',
    copy: 'One deck. Many worlds.',
  },
  {
    id: '03',
    p: 0.215,
    start: 0.16,
    title: 'ABOUT — fragmented libraries',
    copy: 'Your games live in different places.',
  },
  {
    id: '04',
    p: 0.305,
    start: 0.27,
    title: 'ABOUT — convergence',
    copy: 'Bring your library together.',
  },
  { id: '05', p: 0.375, start: 0.33, title: 'TRACK', copy: 'See what you play.' },
  { id: '06', p: 0.445, start: 0.4, title: 'UNDERSTAND', copy: 'Discover your patterns.' },
  {
    id: '07',
    p: 0.515,
    start: 0.48,
    title: 'RECOMMEND — candidates',
    copy: 'Find what fits next.',
  },
  {
    id: '08',
    p: 0.595,
    start: 0.57,
    title: 'HADES — into the product',
    copy: 'A recommendation becomes your next game.',
  },
  {
    id: '09',
    p: 0.655,
    start: 0.63,
    title: 'FEATURES — assembled dashboard',
    copy: 'One usable product.',
  },
  {
    id: '10',
    p: 0.755,
    start: 0.68,
    title: 'FEATURES — active product',
    copy: 'Your library. Your habits. Your next game.',
  },
  {
    id: '11',
    p: 0.915,
    start: 0.88,
    title: 'FEATURES → CONTACT — resolve',
    copy: 'Everything belongs together.',
  },
  {
    id: '12',
    p: 0.97,
    start: 0.94,
    title: 'CONTACT — final deck',
    copy: 'Your next chapter starts here.',
  },
]
export const previsShot = (p) => PREVIS_SHOTS.findLast((s) => p >= s.start) ?? PREVIS_SHOTS[0]
// position xyz / target xyz. All shots share a world; no camera-parented subjects.
export const PREVIS_CAMERA = [
  [0, 0, 0.25, 12, 0, 0.25, 0],
  [0.1, 0, 0.25, 11.9, 0, 0.25, 0],
  [0.16, 0, 0.55, 11.2, 0, 0.55, -0.7],
  [0.27, 0, 0.55, 11, 0, 0.55, -0.9],
  [0.33, 0.25, 0.55, 10.6, 0.25, 0.55, -1.3],
  [0.4, 0.25, 0.55, 10.45, 0.25, 0.55, -1.45],
  [0.48, 0.25, 0.55, 10.3, 0.25, 0.55, -1.6],
  [0.57, 0.25, 0.55, 10.15, 0.25, 0.55, -1.75],
  [0.63, 0.45, 0.55, 11.5, 0.45, 0.55, -0.4],
  [0.88, 0.45, 0.55, 11.5, 0.45, 0.55, -0.4],
  [0.94, 0.8, 0.15, 10.5, 0.8, 0.15, -1.4],
  [1, 0.8, 0.15, 10.5, 0.8, 0.15, -1.4],
]
export function previsCamera(p, width, height) {
  const v = sample(p, PREVIS_CAMERA)
  // Compose through lens and aim, never uniform scaling of the entire world.
  const aspect = width / height
  const profile =
    width < 700 ? 'portrait' : aspect < 1.68 ? '16:10' : width <= 1366 ? 'laptop' : '16:9'
  const fov =
    profile === 'portrait' ? 65 : profile === '16:10' ? 43 : profile === 'laptop' ? 42 : 40
  if (profile === 'portrait') {
    v[0] += 2.8
    v[3] += 2.8
    v[1] += 1.8
    v[4] += 1.8
  }
  return { v, fov, profile }
}
