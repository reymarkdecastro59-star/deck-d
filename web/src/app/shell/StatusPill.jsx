import { cn } from '@/app/ui/cn'

/**
 * Tracker status pill. Currently defaults to `unknown` — no heartbeat
 * endpoint is wired yet, so we shouldn't claim "offline" with authority.
 * status: 'online' | 'offline' | 'unknown'
 */
export function StatusPill({ status = 'unknown', label }) {
  const map = {
    online: {
      dot: 'bg-[var(--app-ok)]',
      text: label ?? 'Tracker online',
      ring: 'ring-[var(--app-ok)]/40',
    },
    offline: {
      dot: 'bg-[var(--app-fg-dim)]',
      text: label ?? 'Tracker offline',
      ring: 'ring-transparent',
    },
    unknown: {
      dot: 'bg-[var(--app-warn)]',
      text: label ?? 'Checking tracker…',
      ring: 'ring-[var(--app-warn)]/40',
    },
  }
  const s = map[status] ?? map.offline
  return (
    <div
      className={cn(
        'flex h-8 items-center gap-2 rounded-[var(--app-r-pill)] px-3',
        'border border-[var(--app-border)] bg-[var(--app-bg-3)]'
      )}
      role="status"
      aria-live="polite"
    >
      <span
        aria-hidden
        className={cn('inline-block h-1.5 w-1.5 rounded-full ring-2', s.dot, s.ring)}
      />
      <span className="truncate text-[12px] text-[var(--app-fg-muted)]">{s.text}</span>
    </div>
  )
}
