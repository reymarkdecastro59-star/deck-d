import { cn } from './cn'

/**
 * Underline tab bar. Controlled — parent passes `value` + `onChange`.
 * items: [{ value, label, count? }]
 */
export function Tabs({ items, value, onChange, className }) {
  return (
    <div
      role="tablist"
      className={cn('flex items-end gap-6 border-b border-[var(--app-hairline)]', className)}
    >
      {items.map((it) => {
        const active = it.value === value
        return (
          <button
            key={it.value}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => onChange?.(it.value)}
            className={cn(
              'relative -mb-px pb-3 pt-2 text-[14px] font-medium transition-colors',
              '[transition-duration:var(--app-dur-2)] [transition-timing-function:var(--app-ease-out)]',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--app-accent)]',
              active
                ? 'text-[var(--app-fg-strong)]'
                : 'text-[var(--app-fg-muted)] hover:text-[var(--app-fg)]'
            )}
          >
            <span className="flex items-center gap-2">
              {it.label}
              {typeof it.count === 'number' && (
                <span
                  className={cn(
                    'app-num inline-flex h-[18px] min-w-[22px] items-center justify-center rounded-full px-1.5 text-[11px]',
                    active
                      ? 'bg-[var(--app-accent-tint)] text-[var(--app-accent-hi)]'
                      : 'bg-[var(--app-bg-3)] text-[var(--app-fg-muted)]'
                  )}
                >
                  {it.count}
                </span>
              )}
            </span>
            {active && (
              <span
                aria-hidden
                className="absolute -bottom-px left-0 right-0 h-[2px] rounded-full bg-[var(--app-accent)]"
              />
            )}
          </button>
        )
      })}
    </div>
  )
}
