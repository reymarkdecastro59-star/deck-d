import { useCallback, useEffect, useState } from 'react'
import { apiFetch } from '@/api/client'

// Sessions view fetches once, then applies patches/deletes optimistically.
// Errors roll the change back and surface via toast-style state.
export function useSessions() {
  const [sessions, setSessions] = useState([])
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
    apiFetch('/sessions?limit=500')
      .then((data) => {
        if (cancelled) return
        setSessions(data.sessions || [])
      })
      .catch((err) => {
        if (cancelled) return
        setError(err.message || 'Failed to load sessions')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  const patchLabel = useCallback(async (sessionId, label) => {
    let prevLabel
    setSessions((rows) =>
      rows.map((r) => {
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
      // Roll back the optimistic write so the row reflects real state.
      setSessions((rows) =>
        rows.map((r) => (r.session_id === sessionId ? { ...r, label: prevLabel } : r))
      )
      throw err
    }
  }, [])

  const deleteSession = useCallback(async (sessionId) => {
    let prevRow
    let prevIndex = -1
    setSessions((rows) => {
      prevIndex = rows.findIndex((r) => r.session_id === sessionId)
      prevRow = rows[prevIndex]
      return rows.filter((r) => r.session_id !== sessionId)
    })
    try {
      await apiFetch(`/sessions/${sessionId}`, { method: 'DELETE' })
    } catch (err) {
      // Restore the row at its prior index so the list order is preserved.
      setSessions((rows) => {
        if (prevIndex < 0 || !prevRow) return rows
        const next = [...rows]
        next.splice(prevIndex, 0, prevRow)
        return next
      })
      throw err
    }
  }, [])

  return { sessions, loading, error, reload, patchLabel, deleteSession }
}
