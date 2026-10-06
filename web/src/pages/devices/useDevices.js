import { useCallback } from 'react'
import { listDevices, renameDevice, revokeDevice } from '@/api/devices'
import { useApiResource } from '@/app/hooks/useApiResource'

// Mirrors useSessions: optimistic apply, roll back on failure. Backend uses
// soft-delete for revoke so the row moves into the Revoked section rather
// than disappearing.
export function useDevices() {
  const { data, loading, error, reload, setData } = useApiResource(() =>
    listDevices().then((r) => r.devices || [])
  )
  const devices = data ?? []

  const rename = useCallback(
    async (deviceId, nextName) => {
      let prev
      setData((rows) =>
        (rows ?? []).map((d) => {
          if (d.device_id !== deviceId) return d
          prev = d.device_name
          return { ...d, device_name: nextName }
        })
      )
      try {
        const resp = await renameDevice(deviceId, nextName)
        setData((rows) => (rows ?? []).map((d) => (d.device_id === deviceId ? resp.device : d)))
      } catch (err) {
        setData((rows) =>
          (rows ?? []).map((d) => (d.device_id === deviceId ? { ...d, device_name: prev } : d))
        )
        throw err
      }
    },
    [setData]
  )

  const revoke = useCallback(
    async (deviceId) => {
      let prev
      const now = Math.floor(Date.now() / 1000)
      setData((rows) =>
        (rows ?? []).map((d) => {
          if (d.device_id !== deviceId) return d
          prev = d.revoked_at
          return { ...d, revoked_at: now }
        })
      )
      try {
        const resp = await revokeDevice(deviceId)
        setData((rows) => (rows ?? []).map((d) => (d.device_id === deviceId ? resp.device : d)))
      } catch (err) {
        setData((rows) =>
          (rows ?? []).map((d) => (d.device_id === deviceId ? { ...d, revoked_at: prev } : d))
        )
        throw err
      }
    },
    [setData]
  )

  return { devices, loading, error, reload, rename, revoke }
}
