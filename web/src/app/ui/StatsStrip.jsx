import { cn } from './cn'

/**
 * Readout panel (UX v2 §5.6): up to four big tabular numbers in ONE panel —
 * not a row of identical KPI boxes. Each item: a 13px label above a mono
 * readout. `value` null/'' renders an em dash so the layout stays stable.
 *
 * Items: [{ label, value, unit?, hint? }]
 */
export function StatsStrip({ items, className }) {
  return (
    <dl
      className={cn(
        'grid grid-cols-2 gap-x-6 gap-y-6 rounded-[var(--app-r-3)] border border-[var(--app-hairline)] bg-[var(--app-bg-2)] p-5 sm:p-6',
        'md:flex md:items-stretch md:gap-0',
        className
      )}
      style={{ boxShadow: 'var(--app-panel-shadow)' }}
    >
      {items.map((it, i) => {
        const has = it.value != null && it.value !== ''
        return (
          <div
            key={it.label}
            className={cn(
              'flex min-w-0 flex-col gap-2',
              'md:flex-1 md:px-6',
              i > 0 && 'md:border-l md:border-[var(--app-hairline)]',
              i === 0 && 'md:pl-0'
            )}
          >
            <dt className="app-wt-small text-[13px] text-[var(--app-fg-muted)]">{it.label}</dt>
            <dd
              className={cn(
                'app-num leading-none tracking-tight',
                has ? 'text-[var(--app-fg-strong)]' : 'text-[var(--app-fg-dim)]'
              )}
              style={{ fontSize: 'clamp(26px, 2.6vw, 34px)' }}
            >
              {has ? it.value : '—'}
              {has && it.unit && (
                <span className="ml-1 text-[15px] text-[var(--app-fg-muted)]">{it.unit}</span>
              )}
            </dd>
            {it.hint && (
              <dd className="app-wt-small text-[13px] text-[var(--app-fg-muted)]">{it.hint}</dd>
            )}
          </div>
        )
      })}
    </dl>
  )
}
