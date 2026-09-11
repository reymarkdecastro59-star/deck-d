import { useCallback, useEffect, useState } from 'react'
import { listDevices, renameDevice, revokeDevice } from '@/api/devices'

// Mirrors the useSessions optimistic pattern: apply the change locally so the
// UI feels instant, roll back on failure. Backend uses soft-delete for revoke
// (returns the row with revoked_at set) so the row moves into the Revoked
// section rather than disappearing.
export function useDevices() {
  const [devices, setDevices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  const reload = useCallback(() => {
    setLoading(true)
    setError(null)
    setReloadKey((k) => k + 1)
  }, [])

  useEffect(() => {
    let cancelled = false
    listDevices()
      .then((data) => {
        if (cancelled) return
        setDevices(data.devices || [])
      })
      .catch((err) => {
        if (cancelled) return
        setError(err.message || 'Failed to load devices')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  const rename = useCallback(async (deviceId, nextName) => {
    let prev
    setDevices((rows) =>
      rows.map((d) => {
        if (d.device_id !== deviceId) return d
        prev = d.device_name
        return { ...d, device_name: nextName }
      })
    )
    try {
      const resp = await renameDevice(deviceId, nextName)
      setDevices((rows) => rows.map((d) => (d.device_id === deviceId ? resp.device : d)))
    } catch (err) {
      setDevices((rows) =>
        rows.map((d) => (d.device_id === deviceId ? { ...d, device_name: prev } : d))
      )
      throw err
    }
  }, [])

  const revoke = useCallback(async (deviceId) => {
    let prev
    const now = Math.floor(Date.now() / 1000)
    setDevices((rows) =>
      rows.map((d) => {
        if (d.device_id !== deviceId) return d
        prev = d.revoked_at
        return { ...d, revoked_at: now }
      })
    )
    try {
      const resp = await revokeDevice(deviceId)
      setDevices((rows) => rows.map((d) => (d.device_id === deviceId ? resp.device : d)))
    } catch (err) {
      setDevices((rows) =>
        rows.map((d) => (d.device_id === deviceId ? { ...d, revoked_at: prev } : d))
      )
      throw err
    }
  }, [])

  return { devices, loading, error, reload, rename, revoke }
}
