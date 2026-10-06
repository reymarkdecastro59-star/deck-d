import { test } from 'node:test'
import assert from 'node:assert/strict'
import { jwtExpiry, isExpiringSoon } from './jwt.js'

const b64url = (obj) =>
  Buffer.from(JSON.stringify(obj)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const token = (payload) => `${b64url({ alg: 'RS256' })}.${b64url(payload)}.sig`

const NOW_MS = 1_790_000_000_000
const NOW = NOW_MS / 1000

test('jwtExpiry reads exp from a base64url payload', () => {
  assert.equal(jwtExpiry(token({ exp: 1234, sub: 'x' })), 1234)
})

test('jwtExpiry returns null for junk', () => {
  assert.equal(jwtExpiry(null), null)
  assert.equal(jwtExpiry('not-a-jwt'), null)
  assert.equal(jwtExpiry('a.!!!.c'), null)
  assert.equal(jwtExpiry(token({ sub: 'no-exp' })), null)
})

test('isExpiringSoon: fresh token is fine', () => {
  assert.equal(isExpiringSoon(token({ exp: NOW + 3600 }), NOW_MS), false)
})

test('isExpiringSoon: expired or inside the skew window needs refresh', () => {
  assert.equal(isExpiringSoon(token({ exp: NOW - 1 }), NOW_MS), true)
  assert.equal(isExpiringSoon(token({ exp: NOW + 60 }), NOW_MS), true) // < 120 s left
  assert.equal(isExpiringSoon(token({ exp: NOW + 121 }), NOW_MS), false)
})

test('isExpiringSoon: unreadable token is treated as expired', () => {
  assert.equal(isExpiringSoon('garbage', NOW_MS), true)
  assert.equal(isExpiringSoon(null, NOW_MS), true)
})
