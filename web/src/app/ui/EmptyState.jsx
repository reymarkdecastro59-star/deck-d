import { cn } from './cn'

/**
 * Intentional empty state — used when a page or panel has no data yet.
 * Not a spinner, not a toast. Explains what's happening and offers a next action.
 */
export function EmptyState({ icon, title, description, action, className }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        'rounded-[var(--app-r-3)] border border-[var(--app-border)]',
        'bg-[var(--app-bg-2)] px-8 py-14',
        className
      )}
    >
      {icon && <div className="mb-4 text-[var(--app-fg-dim)]">{icon}</div>}
      <h3 className="text-[18px] font-semibold tracking-[-0.01em] text-[var(--app-fg-strong)]">
        {title}
      </h3>
      {description && (
        <p className="app-wt-small mt-2 max-w-[460px] text-[15px] leading-[1.55] text-[var(--app-fg-muted)]">
          {description}
        </p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
