import { Euler, Vector3 } from 'three'
import { sample } from '../hooks/timelinePhases.js'
export const DASH_SLOT = [-1.06, -0.88, 0.145]
export function dashboardPose(p) {
  const v = sample(p, [
    [0, 3.15, 0.1, -11, 0.06, -0.24, 0.025],
    [0.54, 3.15, 0.1, -11, 0.06, -0.24, 0.025],
    [0.605, 3.15, 0.1, -0.65, 0.06, -0.24, 0.025],
    [0.64, 3.15, 0.1, -0.65, 0.06, -0.24, 0.025],
    [0.66, 3.1, 0.25, -1.8, 0.04, -0.15, 0.015],
    [0.81, 3.1, 0.25, -1.8, 0.04, -0.15, 0.015],
    [0.835, 3.15, 0.1, -0.65, 0.06, -0.24, 0.025],
    [0.92, 2.6, 0, 0, 0.12, -0.44, -0.27],
    [1, 2.6, 0, -0.15, 0.12, -0.44, -0.27],
  ])
  return { position: v.slice(0, 3), rotation: v.slice(3) }
}
export function dockPose(p) {
  const d = dashboardPose(p)
  const v = new Vector3(...DASH_SLOT)
    .applyEuler(new Euler(...d.rotation))
    .add(new Vector3(...d.position))
  return [...v.toArray(), ...d.rotation, 0.344]
}
