import { cn } from '@/app/ui/cn'

/**
 * Horizontal segmented bar for share visualization (label breakdown, etc).
 * segments: [{ key, value, color, label }]
 * Segments render proportionally to total; zero-value segments are dropped.
 */
export function DistributionBar({ segments, height = 10, className, ariaLabel = 'Distribution' }) {
  const items = segments.filter((s) => s.value > 0)
  const total = items.reduce((sum, s) => sum + s.value, 0)
  if (total === 0) {
    return (
      <div
        className={cn('rounded-full bg-[var(--app-bg-3)]', className)}
        style={{ height }}
        aria-label={ariaLabel}
        role="img"
      />
    )
  }
  return (
    <div
      className={cn('flex overflow-hidden rounded-full bg-[var(--app-bg-3)]', className)}
      style={{ height }}
      role="img"
      aria-label={ariaLabel}
    >
      {items.map((s) => (
        <div
          key={s.key}
          style={{ width: `${(s.value / total) * 100}%`, background: s.color }}
          title={s.label ? `${s.label} — ${((s.value / total) * 100).toFixed(0)}%` : undefined}
        />
      ))}
    </div>
  )
}
