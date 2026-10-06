import { cn } from '@/app/ui/cn'

/**
 * Thin horizontal bar showing decay-weighted momentum out of total union hours.
 * Used inside the "Top games" list. Not a percentage — a visual weight scaled
 * against the group's max decay so the eye can rank ordering at a glance.
 */
export function MomentumBar({ value, max, className }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div
      className={cn('relative h-2.5 overflow-hidden rounded-[3px] bg-[var(--app-bg-3)]', className)}
      aria-hidden
    >
      <div
        className="absolute inset-y-0 left-0 rounded-[3px]"
        style={{ width: `${pct}%`, background: 'var(--app-accent)' }}
      />
    </div>
  )
}
