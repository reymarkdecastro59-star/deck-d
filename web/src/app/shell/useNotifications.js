import { useCallback, useEffect, useState } from 'react'
import { apiFetch } from '@/api/client'
import { useApiResource } from '@/app/hooks/useApiResource'

const READ_STORAGE_KEY = 'notifications.read'

// Read state lives in localStorage keyed by user-visible email. Derived
// notifications keep stable IDs across polls, so marking one read here
// hides it permanently on this device even after a refetch.
function loadReadSet() {
  try {
    const raw = localStorage.getItem(READ_STORAGE_KEY)
    return new Set(raw ? JSON.parse(raw) : [])
  } catch {
    return new Set()
  }
}

function saveReadSet(set) {
  try {
    localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(Array.from(set)))
  } catch {
    // Storage full or blocked — safe to ignore, read state degrades to
    // in-memory only for the session.
  }
}

export function useNotifications() {
  const res = useApiResource(() =>
    apiFetch('/notifications').then((body) => body.notifications ?? [])
  )
  const [readSet, setReadSet] = useState(loadReadSet)

  useEffect(() => {
    saveReadSet(readSet)
  }, [readSet])

  const markRead = useCallback((id) => {
    setReadSet((prev) => {
      if (prev.has(id)) return prev
      const next = new Set(prev)
      next.add(id)
      return next
    })
  }, [])

  const markAllRead = useCallback(() => {
    if (!res.data) return
    setReadSet((prev) => {
      const next = new Set(prev)
      for (const n of res.data) next.add(n.id)
      return next
    })
  }, [res.data])

  const items = (res.data ?? []).map((n) => ({ ...n, read: readSet.has(n.id) }))
  const unreadCount = items.filter((n) => !n.read).length

  return {
    items,
    unreadCount,
    loading: res.loading,
    error: res.error,
    reload: res.reload,
    markRead,
    markAllRead,
  }
}
