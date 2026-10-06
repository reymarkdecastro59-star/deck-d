import { cn } from '@/app/ui/cn'
import { formatHours } from '@/lib/format'

/**
 * Daily activity bars (brand §2.5: series 1 = Signal; axes in the hairline,
 * tick labels 12px tertiary). HTML, not a stretched SVG: the previous
 * `preserveAspectRatio="none"` SVG squashed its text into unreadable,
 * overlapping glyphs at wide sizes.
 *
 * data: [{ label, value, date? }] — value in hours. With more than 14 bars,
 * ticks are spaced by bar count and labelled with the date.
 */
export function BarChart({ data, height = 140, className, ariaLabel = 'Bar chart' }) {
  const max = Math.max(0.1, ...data.map((d) => d.value))
  const dense = data.length > 14
  // Tick spacing scales with bar count so labels never collide, even on a
  // phone: every bar up to 14, weekly up to a month, every 3 weeks beyond.
  const step = data.length <= 31 ? 7 : 21
  const tick = (d, i) => {
    if (!dense) return d.label
    // Left-aligned from its bar, so none in the last few bars (would overflow).
    if (i % step !== 0 || i > data.length - 5) return ''
    return d.date
      ? d.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      : d.label
  }
  const summary = data
    .filter((d) => d.value > 0)
    .map((d) => `${d.date ? d.date.toDateString() : d.label}: ${formatHours(d.value)} h`)
    .join(', ')

  return (
    <figure className={cn('w-full', className)}>
      <div
        role="img"
        aria-label={`${ariaLabel}. ${summary || 'No play in this range.'}`}
        className={cn(
          'flex items-end border-b border-[var(--app-border)]',
          dense ? 'gap-[2px]' : 'gap-2'
        )}
        style={{ height }}
      >
        {data.map((d, i) => (
          <div
            key={i}
            title={`${d.date ? d.date.toLocaleDateString() : d.label}: ${formatHours(d.value)} h`}
            className="flex h-full min-w-0 flex-1 items-end"
          >
            <span
              className="block w-full rounded-t-[3px]"
              style={{
                height: d.value > 0 ? `${Math.max(3, (d.value / max) * 100)}%` : '2px',
                background: d.value > 0 ? 'var(--app-accent)' : 'var(--app-border)',
              }}
            />
          </div>
        ))}
      </div>
      <div aria-hidden className={cn('mt-2 flex', dense ? 'gap-[2px]' : 'gap-2')}>
        {data.map((d, i) => (
          <span
            key={i}
            // Dense ticks start at their bar and run right, inside the chart.
            className={cn(
              'app-num min-w-0 flex-1 overflow-visible whitespace-nowrap text-[12px] text-[var(--app-fg-dim)]',
              dense ? 'text-left' : 'text-center'
            )}
          >
            {tick(d, i)}
          </span>
        ))}
      </div>
    </figure>
  )
}
