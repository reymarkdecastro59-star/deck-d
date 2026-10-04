import { useEffect, useState } from 'react'
import { apiFetch } from '@/api/client'
import { connectedDevice } from '@/lib/devices'

/**
 * Polls /devices until a connected tracker shows up. The agent checks in on
 * launch and every minute (POST /devices/heartbeat), so a freshly started
 * tracker appears within about a minute.
 * Returns { device, checked } — `checked` is false until the first answer.
 */
export function useConnectedTracker({ intervalMs = 5000, enabled = true } = {}) {
  const [state, setState] = useState({ device: null, checked: false })

  useEffect(() => {
    if (!enabled) return undefined
    let cancelled = false
    let timer = null

    const check = async () => {
      try {
        const body = await apiFetch('/devices')
        if (cancelled) return
        const device = connectedDevice(body.devices)
        setState({ device, checked: true })
        if (device) return // found — stop polling
      } catch {
        if (!cancelled) setState((s) => ({ ...s, checked: true }))
      }
      if (!cancelled && intervalMs > 0) timer = setTimeout(check, intervalMs)
    }

    check()
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [enabled, intervalMs])

  return state
}
