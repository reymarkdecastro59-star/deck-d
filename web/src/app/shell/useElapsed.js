import { useEffect, useState } from 'react'

/** Seconds since `startedAtSec`, ticking once a minute (enough for "1 h 12 m"). */
export function useElapsed(startedAtSec) {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000))
  useEffect(() => {
    if (!startedAtSec) return undefined
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 30_000)
    return () => clearInterval(id)
  }, [startedAtSec])
  return startedAtSec ? Math.max(0, now - startedAtSec) : 0
}
