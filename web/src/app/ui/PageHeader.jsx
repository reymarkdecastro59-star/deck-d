import { cn } from './cn'

/**
 * Page header for every signed-in page except Overview (which leads with its
 * hero). UX v2 §2 R3: the title is the top type tier on the page.
 *
 *   ┌ title (28–34 / 600) ─────────────────────────────── actions ┐
 *   │ summary: "7 games · one plain sentence" (15 / secondary)    │
 *   └ toolbar: search, filters, sort (its own row, below)         ┘
 *
 * The title row is read first; controls sit on their own row so they never
 * compete with the title for attention.
 */
export function PageHeader({ title, count, countLabel, lede, actions, toolbar, className }) {
  const hasCount = count != null && count !== ''
  return (
    <header className={cn('flex flex-col gap-5 pb-8', className)}>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <h1 className="text-[28px] font-semibold leading-[1.1] tracking-[-0.025em] text-[var(--app-fg-strong)] sm:text-[34px]">
            {title}
          </h1>
          {(hasCount || lede) && (
            <p className="app-wt-small mt-2 max-w-[680px] text-[15px] leading-[1.55] text-[var(--app-fg-muted)]">
              {hasCount && (
                <span className="app-num text-[var(--app-fg)]">
                  {typeof count === 'number' ? count.toLocaleString() : count}
                  {countLabel ? ` ${countLabel}` : ''}
                </span>
              )}
              {hasCount && lede && <span aria-hidden> · </span>}
              {lede}
            </p>
          )}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {toolbar && <div className="flex flex-wrap items-center gap-3">{toolbar}</div>}
    </header>
  )
}

/**
 * Shared page frame: the content grid from UX v2 §5.1 (max 1600, centred,
 * margins 16 / 24 / 40). Overview uses the same values.
 */
export function PageFrame({ className, children }) {
  return (
    <div
      className={cn('mx-auto w-full px-4 pb-16 pt-4 sm:px-6 lg:px-10', className)}
      style={{ maxWidth: 'var(--app-content-max)' }}
    >
      {children}
    </div>
  )
}
