import { test } from 'node:test'
import assert from 'node:assert/strict'
import { connectedDevice } from './devices.js'

test('connectedDevice picks the most recently seen active device', () => {
  const d = connectedDevice([
    { device_name: 'Old', last_seen: 100 },
    { device_name: 'New', last_seen: 300 },
    { device_name: 'Mid', last_seen: 200 },
  ])
  assert.equal(d.device_name, 'New')
})

test('connectedDevice ignores revoked and never-seen devices', () => {
  assert.equal(connectedDevice([{ device_name: 'R', last_seen: 9, revoked_at: 5 }]), null)
  assert.equal(connectedDevice([{ device_name: 'N', last_seen: 0 }]), null)
  assert.equal(connectedDevice([]), null)
  assert.equal(connectedDevice(undefined), null)
})
