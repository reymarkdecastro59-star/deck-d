import { cn } from './cn'

/**
 * Module panel — the one sanctioned container (UX v2 R5/R6).
 * Common region groups a module preattentively; elevation is a lighter
 * surface plus a hairline, never a heavy shadow. Never nest panels.
 */
export function Panel({ as: Comp = 'section', className, children, ...rest }) {
  return (
    <Comp
      className={cn(
        'min-w-0 rounded-[var(--app-r-3)] border border-[var(--app-hairline)] bg-[var(--app-bg-2)] p-5 sm:p-6',
        className
      )}
      style={{ boxShadow: 'var(--app-panel-shadow)' }}
      {...rest}
    >
      {children}
    </Comp>
  )
}

/** Module heading: H2 22px, optional one-line description and "view all" slot. */
export function PanelHead({ title, description, action, id, className }) {
  return (
    <div className={cn('mb-5 flex items-end justify-between gap-4', className)}>
      <div className="min-w-0">
        <h2
          id={id}
          className="text-[20px] font-semibold leading-tight tracking-[-0.015em] text-[var(--app-fg-strong)] sm:text-[22px]"
        >
          {title}
        </h2>
        {description && (
          <p className="app-wt-small mt-1 text-[14px] text-[var(--app-fg-muted)]">{description}</p>
        )}
      </div>
      {action}
    </div>
  )
}
