import { useCallback } from 'react'
import { apiFetch } from '@/api/client'
import { useApiResource } from '@/app/hooks/useApiResource'

// Sessions view fetches once, then applies patches/deletes optimistically.
// Errors roll the change back and surface via toast-style state.
export function useSessions() {
  const { data, loading, error, reload, setData } = useApiResource(() =>
    apiFetch('/sessions?limit=500').then((r) => r.sessions || [])
  )
  const sessions = data ?? []

  const patchLabel = useCallback(
    async (sessionId, label) => {
      let prevLabel
      setData((rows) =>
        (rows ?? []).map((r) => {
          if (r.session_id !== sessionId) return r
          prevLabel = r.label
          return { ...r, label }
        })
      )
      try {
        await apiFetch(`/sessions/${sessionId}`, {
          method: 'PATCH',
          body: JSON.stringify({ label }),
        })
      } catch (err) {
        // Roll back so the row reflects real state.
        setData((rows) =>
          (rows ?? []).map((r) => (r.session_id === sessionId ? { ...r, label: prevLabel } : r))
        )
        throw err
      }
    },
    [setData]
  )

  const deleteSession = useCallback(
    async (sessionId) => {
      let prevRow
      let prevIndex = -1
      setData((rows) => {
        const list = rows ?? []
        prevIndex = list.findIndex((r) => r.session_id === sessionId)
        prevRow = list[prevIndex]
        return list.filter((r) => r.session_id !== sessionId)
      })
      try {
        await apiFetch(`/sessions/${sessionId}`, { method: 'DELETE' })
      } catch (err) {
        setData((rows) => {
          const list = rows ?? []
          if (prevIndex < 0 || !prevRow) return list
          const next = [...list]
          next.splice(prevIndex, 0, prevRow)
          return next
        })
        throw err
      }
    },
    [setData]
  )

  return { sessions, loading, error, reload, patchLabel, deleteSession }
}
