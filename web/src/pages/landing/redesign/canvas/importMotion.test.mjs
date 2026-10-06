import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Euler, Vector3 } from 'three'
import { importPose, IMPORT_BEATS, IMPORT_SLOTS, HUB_POSITION } from './importMotion.js'
import { dashboardPose } from './sceneMath.js'

test('imported covers land in the matching library slot and follow the dashboard', () => {
  IMPORT_BEATS.forEach(([start, end], i) => {
    for (let p = start + (end - start) * 0.86; p < 0.876; p += 0.001) {
      const dashboard = dashboardPose(p)
      const expected = new Vector3(...IMPORT_SLOTS[i])
        .applyEuler(new Euler(...dashboard.rotation))
        .add(new Vector3(...dashboard.position))
      const actual = importPose(p, i)
      assert.ok(expected.distanceTo(new Vector3(...actual.position)) < 1e-9)
      assert.deepEqual(actual.rotation, dashboard.rotation)
    }
  })
})

test('curved import passes through the hub and is continuous and reversible while visible', () => {
  IMPORT_BEATS.forEach(([start, end], index) => {
    const points = Array.from({ length: 1001 }, (_, i) => start + ((end - start) * i) / 1000)
    const forward = points.map((p) => importPose(p, index).position)
    assert.deepEqual(
      forward,
      [...points]
        .reverse()
        .map((p) => importPose(p, index).position)
        .reverse()
    )
    for (let i = 1; i < forward.length; i++) {
      assert.ok(new Vector3(...forward[i]).distanceTo(new Vector3(...forward[i - 1])) < 0.03)
    }
    const hub = new Vector3(...HUB_POSITION)
    assert.ok(forward.some((p) => new Vector3(...p).distanceTo(hub) < 0.53))
  })
})
