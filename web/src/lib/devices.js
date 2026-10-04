// Device helpers shared by onboarding and the shell.

/**
 * The most recently seen non-revoked tracker, or null.
 * Since the agent heartbeat (POST /devices/heartbeat), a device exists as
 * soon as a signed-in tracker starts — no game session required.
 */
export function connectedDevice(devices) {
  const live = (devices ?? []).filter((d) => d && !d.revoked_at && d.last_seen)
  if (live.length === 0) return null
  return live.reduce((a, b) => (b.last_seen > a.last_seen ? b : a))
}
