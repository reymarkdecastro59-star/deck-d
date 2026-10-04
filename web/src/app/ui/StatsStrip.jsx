import { cn } from './cn'

/**
 * Inline, typographic stats block that replaces "4 identical KPI tiles"
 * dashboards. Each item is a big monospaced value with a small uppercase
 * label beneath. Separated by thin hairlines on md+, stacked with visible
 * whitespace on phone. No cards, no icons, no colored backgrounds — the
 * numbers themselves are the composition.
 *
 * Items: [{ label, value, unit? }]. `value` may be null/undefined; that
 * renders as an em-dash so empty states still lay out at a stable height.
 */
export function StatsStrip({ items, className }) {
  return (
    <dl
      className={cn(
        'grid grid-cols-2 gap-x-4 gap-y-6',
        'md:flex md:items-stretch md:gap-0',
        className
      )}
    >
      {items.map((it, i) => {
        const has = it.value != null && it.value !== ''
        return (
          <div
            key={it.label}
            className={cn(
              'min-w-0',
              'md:flex-1 md:px-6',
              i > 0 && 'md:border-l md:border-[var(--app-hairline)]',
              i === 0 && 'md:pl-0'
            )}
          >
            <dt className="app-eyebrow order-2 mt-2 block text-[10px] text-[var(--app-fg-muted)]">
              {it.label}
            </dt>
            <dd
              className={cn(
                'app-num order-1 leading-none tracking-tight',
                has ? 'text-[var(--app-fg-strong)]' : 'text-[var(--app-fg-dim)]'
              )}
              style={{ fontSize: 'clamp(24px, 2.6vw, 32px)' }}
            >
              {has ? it.value : '—'}
              {has && it.unit && (
                <span className="ml-1 text-[13px] font-normal text-[var(--app-fg-muted)]">
                  {it.unit}
                </span>
              )}
            </dd>
          </div>
        )
      })}
    </dl>
  )
}
