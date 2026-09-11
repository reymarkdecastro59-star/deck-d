import { cn } from './cn'

/**
 * Two-or-more mutually exclusive options in a bordered pill.
 * Good for: grid/list view toggle, timeframe selector.
 */
export function SegmentedControl({ items, value, onChange, size = 'md', className }) {
  const h = size === 'sm' ? 'h-8 text-[12px]' : 'h-10 text-[13px]'
  return (
    <div
      role="radiogroup"
      className={cn(
        'inline-flex items-center gap-0.5 rounded-[var(--app-r-2)] p-0.5',
        'border border-[var(--app-border)] bg-[var(--app-bg-2)]',
        h,
        className
      )}
    >
      {items.map((it) => {
        const active = it.value === value
        return (
          <button
            key={it.value}
            role="radio"
            aria-checked={active}
            type="button"
            onClick={() => onChange?.(it.value)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-[var(--app-r-1)] px-3 transition-colors',
              '[transition-duration:var(--app-dur-1)]',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-accent)]',
              active
                ? 'bg-[var(--app-bg-3)] text-[var(--app-fg-strong)]'
                : 'text-[var(--app-fg-muted)] hover:text-[var(--app-fg)]',
              'h-full'
            )}
          >
            {it.icon}
            {it.label}
          </button>
        )
      })}
    </div>
  )
}
