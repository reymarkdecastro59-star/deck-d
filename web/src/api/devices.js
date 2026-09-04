import { apiFetch } from '@/api/client'

export function listDevices() {
  return apiFetch('/devices')
}

export function renameDevice(deviceId, deviceName) {
  return apiFetch(`/devices/${encodeURIComponent(deviceId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ device_name: deviceName }),
  })
}

export function revokeDevice(deviceId) {
  return apiFetch(`/devices/${encodeURIComponent(deviceId)}`, {
    method: 'DELETE',
  })
}
