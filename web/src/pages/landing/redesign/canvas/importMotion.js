import { Euler, Vector3 } from 'three'
import { dashboardPose } from './sceneMath.js'
import { interval, lerp } from '../hooks/timelinePhases.js'

export const LAUNCHER_POSITIONS = [
  [-1.8, 0.42, 0],
  [-0.65, -0.58, 0],
  [0.7, -0.58, 0],
  [1.8, 0.42, 0],
]
export const HUB_POSITION = [3.15, -2.02, 0.4]
export const HUB_ROTATION = [0, 0, 0]
export const IMPORT_SLOTS = [
  [-1.06, 0.77, 0.13],
  [0.256, 0.77, 0.13],
]
export const IMPORT_BEATS = [
  [0.642, 0.678],
  [0.75, 0.786],
]

// Pure scroll sampling keeps forward/reverse playback and resize deterministic.
export function importPose(p, index) {
  const d = dashboardPose(p)
  const target = new Vector3(...IMPORT_SLOTS[index])
    .applyEuler(new Euler(...d.rotation))
    .add(new Vector3(...d.position))
  const [a, b] = IMPORT_BEATS[index],
    t = (p - a) / (b - a)
  if (t < 0 || t >= 1)
    return { position: target.toArray(), rotation: d.rotation, scale: 0.339, active: false }
  const start = new Vector3(...LAUNCHER_POSITIONS[index])
    .applyEuler(new Euler(...HUB_ROTATION))
    .add(new Vector3(...HUB_POSITION))
  start.z += 0.1
  const hub = new Vector3(...HUB_POSITION).add(new Vector3(-0.45, 0.1, 0.22))
  const f = interval(t, 0.13, 0.86)
  let position
  if (f < 0.42) {
    const u = interval(f, 0, 0.42)
    position = start.lerp(hub, u)
    position.y += Math.sin(u * Math.PI) * 0.22
  } else {
    const u = interval(f, 0.42, 1)
    position = hub.lerp(target, u)
    position.x -= Math.sin(u * Math.PI) * 0.3
  }
  return {
    position: position.toArray(),
    rotation: d.rotation,
    scale: lerp(0.24, 0.339, interval(f, 0.65, 1)),
    active: true,
  }
}
