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
        'rounded-[var(--app-r-3)] border border-dashed border-[var(--app-border)]',
        'bg-[var(--app-bg-2)]/60 px-8 py-16',
        className
      )}
    >
      {icon && <div className="mb-4 text-[var(--app-fg-dim)]">{icon}</div>}
      <h3 className="text-[17px] font-medium tracking-tight text-[var(--app-fg)]">{title}</h3>
      {description && (
        <p className="mt-2 max-w-[420px] text-[13.5px] leading-relaxed text-[var(--app-fg-muted)]">
          {description}
        </p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
