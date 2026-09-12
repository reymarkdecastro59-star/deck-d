import { useEffect, useState } from 'react'
import { WifiOff } from 'lucide-react'

/**
 * Subtle top-of-viewport banner that appears when the browser reports
 * offline state. We do NOT try to interpret HTTP failures as "offline" —
 * false positives there are common. This banner only reacts to native
 * online/offline events, which are conservative but accurate.
 */
export function OfflineBanner() {
  // Server-render safe: navigator is defined in the browser only. Vite ships
  // client-side so this is really just a hedge.
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine)

  useEffect(() => {
    const goOnline = () => setOnline(true)
    const goOffline = () => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  if (online) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-3 z-50 flex justify-center px-4"
    >
      <div className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-[var(--app-warn)] bg-[var(--app-warn-tint)] px-3.5 py-1.5 text-[12.5px] text-[var(--app-fg)] shadow-lg backdrop-blur">
        <WifiOff className="h-3.5 w-3.5 text-[var(--app-warn)]" strokeWidth={2} />
        <span>You're offline — changes won't sync until the connection returns.</span>
      </div>
    </div>
  )
}
