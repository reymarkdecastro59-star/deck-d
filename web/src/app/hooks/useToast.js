import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * useToast(timeoutMs) — one-message-at-a-time toast state with auto-clear.
 * The Sessions and Devices pages previously duplicated this identical
 * useState + useEffect(setTimeout) pattern, which is textbook "effect used
 * as event handler". Encoding the timer in the setter keeps the extra
 * render cycle out of the hot path.
 */
export function useToast(timeoutMs = 4000) {
  const [toast, setToast] = useState(null)
  const timerRef = useRef(null)

  const showToast = useCallback(
    (msg) => {
      if (timerRef.current) clearTimeout(timerRef.current)
      setToast(msg)
      if (msg) {
        timerRef.current = setTimeout(() => setToast(null), timeoutMs)
      }
    },
    [timeoutMs]
  )

  const dismissToast = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setToast(null)
  }, [])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return { toast, showToast, dismissToast }
}
