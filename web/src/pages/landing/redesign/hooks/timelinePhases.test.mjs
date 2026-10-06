import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  PHASES,
  PHASE_ORDER,
  NAV_POINTS,
  FEATURE_BEATS,
  sample,
  phaseIndex,
} from './timelinePhases.js'
import { dashboardPose, dockPose, DASH_SLOT } from '../canvas/sceneMath.js'
import { Euler, Vector3 } from 'three'

test('every navigation destination reaches the correct readable chapter', () => {
  PHASE_ORDER.forEach((key, i) => assert.equal(phaseIndex(NAV_POINTS[key]), i))
  PHASE_ORDER.slice(1).forEach((key, i) => assert.equal(PHASES[key][0], PHASES[PHASE_ORDER[i]][1]))
  FEATURE_BEATS.forEach((beat) => {
    assert.equal(phaseIndex(beat.start + 0.019), 3)
    assert.ok(beat.start + 0.019 < beat.end)
  })
})

test('sampling is continuous, reversible and holds still during reading intervals', () => {
  const frames = [
    [0, 2, 0, 1],
    [0.13, 2, 0, 1],
    [0.17, 0.35, 0.1, 7.1],
    [0.222, 2.45, -0.12, 1],
  ]
  assert.deepEqual(sample(0.04, frames), sample(0.12, frames))
  const points = Array.from({ length: 223 }, (_, i) => i / 1000)
  const forward = points.map((p) => sample(p, frames))
  const reverse = [...points]
    .reverse()
    .map((p) => sample(p, frames))
    .reverse()
  assert.deepEqual(forward, reverse)
  for (const [p] of frames.slice(1)) {
    const before = sample(p - 1e-7, frames),
      after = sample(p + 1e-7, frames)
    before.forEach((v, i) => assert.ok(Math.abs(v - after[i]) < 1e-4))
  }
})

test('recommendation stays exactly attached to its dashboard slot throughout the tour', () => {
  for (let p = 0.602; p <= 0.842; p += 0.001) {
    const dashboard = dashboardPose(p),
      card = dockPose(p)
    const position = new Vector3(...card.slice(0, 3)).sub(new Vector3(...dashboard.position))
    const inverse = new Euler(...dashboard.rotation)
    // Undo the dashboard transform through its quaternion, not Euler negation.
    const rotation = new Vector3(...DASH_SLOT).applyEuler(inverse)
    assert.ok(position.distanceTo(rotation) < 1e-10)
    assert.deepEqual(card.slice(3, 6), dashboard.rotation)
  }
})

import { featureLifecycle, lifecycle } from './timelinePhases.js'
import { CAMERA_JOURNEY } from '../canvas/cameraJourney.js'
test('feature subjects never overlap and replay identically in reverse', () => {
  const progress = Array.from({ length: 1001 }, (_, i) => 0.6 + i * 0.00025)
  const values = progress.map((p) => FEATURE_BEATS.map((_, i) => featureLifecycle(p, i).opacity))
  values.forEach((row) => assert.ok(row.filter((opacity) => opacity > 0).length <= 1))
  progress.reverse().forEach((p, i) => assert.deepEqual(
    FEATURE_BEATS.map((_, j) => featureLifecycle(p, j).opacity), values[values.length - 1 - i]))
  assert.equal(lifecycle(0.678, 0.642, 0.678).phase, 'INACTIVE')
  FEATURE_BEATS.forEach((b, i) => assert.equal(featureLifecycle((b.start + b.end) / 2, i).phase, 'ACTIVE'))
})
test('camera visits both flanks, moves deeper, and closes with an elevated pullback', () => {
  const home = sample(0.04, CAMERA_JOURNEY), about = sample(0.285, CAMERA_JOURNEY)
  const how = sample(0.465, CAMERA_JOURNEY), features = sample(0.7, CAMERA_JOURNEY)
  const contact = sample(0.96, CAMERA_JOURNEY)
  assert.ok(about[0] < home[0] && features[0] > home[0])
  assert.ok(how[2] < about[2])
  assert.ok(contact[1] > features[1] && contact[2] > home[2])
})
