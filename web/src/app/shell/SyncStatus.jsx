import { Link } from 'react-router-dom'
import { cn } from '@/app/ui/cn'
import { StateShape } from '@/app/ui/brand'
import { useTracking } from './trackingContext'

/**
 * Top-bar tracking status. Truthful by design: the agent only reports when a
 * session finishes, so without a live heartbeat we say "Synced 2 h ago",
 * never "Live". Shape + text carry the meaning; links to device setup.
 */
export function SyncStatus() {
  const { sync, live } = useTracking()
  if (sync.status === 'unknown' && !live) return null

  const text = live ? `Live · ${live.device_name ?? 'playing now'}` : sync.label
  const shape = live
    ? null
    : sync.status === 'synced'
      ? 'active'
      : sync.status === 'stale'
        ? 'drifting'
        : 'dormant'

  return (
    <Link
      to="/devices"
      aria-label={`Tracking status: ${text}. Open devices`}
      className={cn(
        'hidden h-9 items-center gap-2 rounded-[var(--app-r-2)] px-2.5 text-[14px] lg:inline-flex',
        'transition-colors [transition-duration:var(--app-dur-1)] hover:bg-[var(--app-bg-2)]',
        live ? 'text-[var(--app-fg)]' : 'app-wt-small text-[var(--app-fg-muted)]'
      )}
    >
      {live ? (
        <span aria-hidden className="app-live-dot h-2 w-2 rounded-full bg-[var(--app-accent)]" />
      ) : (
        <StateShape state={shape} size={8} />
      )}
      {text}
    </Link>
  )
}
