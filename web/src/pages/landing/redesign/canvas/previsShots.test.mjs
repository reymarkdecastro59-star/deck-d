import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PREVIS_SHOTS, PREVIS_CAMERA, previsShot, previsCamera } from './previsShots.js'
import { sample } from '../hooks/timelinePhases.js'

test('reduced-motion compositions cover every story beat including both handoffs', () => {
  assert.equal(PREVIS_SHOTS.length, 12)
  for (const shot of PREVIS_SHOTS) assert.equal(previsShot(shot.p).id, shot.id)
  assert.equal(previsShot(0.595).id, '08')
  assert.equal(previsShot(0.915).id, '11')
})
test('camera is continuous at every cut and motionless throughout product reading', () => {
  for (const [p] of PREVIS_CAMERA.slice(1, -1)) {
    const a = sample(p - 1e-6, PREVIS_CAMERA),
      b = sample(p + 1e-6, PREVIS_CAMERA)
    a.forEach((v, i) => assert.ok(Math.abs(v - b[i]) < 0.001))
  }
  assert.deepEqual(sample(0.64, PREVIS_CAMERA), sample(0.87, PREVIS_CAMERA))
  assert.deepEqual(sample(0.95, PREVIS_CAMERA), sample(0.99, PREVIS_CAMERA))
})
test('desktop, laptop and portrait use authored lens and aim profiles', () => {
  const profiles = [
    [1920, 1080, '16:9'],
    [1440, 900, '16:10'],
    [1366, 768, 'laptop'],
    [390, 844, 'portrait'],
  ]
  for (const [w, h, name] of profiles) {
    const pose = previsCamera(0.655, w, h)
    assert.equal(pose.profile, name)
    assert.ok(pose.v.every(Number.isFinite))
  }
  assert.ok(previsCamera(0.655, 390, 844).v[3] > previsCamera(0.655, 1440, 900).v[3])
})
