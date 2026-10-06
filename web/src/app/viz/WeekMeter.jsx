import { cn } from '@/app/ui/cn'
import { formatHours } from '@/lib/format'

/**
 * Week Meter — seven segments (Mon–Sun), lit in Signal on play days, height
 * encoding hours. The signature telemetry instrument (UX v2 §3), echoing the
 * landing page's rails. Today is outlined; future days are dashed.
 * The whole meter is one image with a complete text alternative.
 */
export function WeekMeter({ days, height = 96, compact = false, className }) {
  const max = Math.max(1, ...days.map((d) => d.hours))
  const label =
    'Hours played each day this week: ' +
    days
      .map((d) => `${d.label} ${d.isFuture ? 'not yet' : `${formatHours(d.hours)} hours`}`)
      .join(', ')

  return (
    <div
      role="img"
      aria-label={label}
      className={cn('flex', compact ? 'gap-1.5' : 'gap-2', className)}
    >
      {days.map((d) => (
        <div key={d.label} className="flex min-w-0 flex-1 flex-col items-stretch gap-2">
          <div
            className={cn(
              'relative overflow-hidden rounded-[4px] bg-[var(--app-bg-3)]',
              d.isFuture && 'border border-dashed border-[var(--app-border)] bg-transparent'
            )}
            style={{
              height,
              outline: d.isToday ? '1px solid var(--app-border-strong)' : undefined,
              outlineOffset: 2,
            }}
          >
            {d.hours > 0 ? (
              <span
                className="absolute inset-x-0 bottom-0 rounded-[3px] bg-[var(--app-accent)]"
                style={{
                  height: `${Math.max(6, (d.hours / max) * 100)}%`,
                  // LED-style segment ticks, cut from the bar with the canvas colour.
                  backgroundImage:
                    'repeating-linear-gradient(0deg, transparent 0 calc(25% - 1px), var(--app-bg-2) calc(25% - 1px) 25%)',
                }}
              />
            ) : (
              !d.isFuture && (
                <span className="absolute inset-x-0 bottom-0 h-1 rounded-[2px] bg-[var(--app-border)]" />
              )
            )}
          </div>
          <span
            className={cn(
              'text-center text-[13px]',
              d.isToday
                ? 'font-semibold text-[var(--app-fg)]'
                : 'app-wt-small text-[var(--app-fg-muted)]'
            )}
          >
            {compact ? d.label.charAt(0) : d.label}
          </span>
        </div>
      ))}
    </div>
  )
}
