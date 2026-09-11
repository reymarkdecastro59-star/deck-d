import { cn } from './cn'
import { Button } from './Button'

export function ErrorState({
  title = 'Something went wrong',
  description,
  onRetry,
  retryLabel = 'Try again',
  className,
}) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center text-center',
        'rounded-[var(--app-r-3)] border border-[var(--app-border)]',
        'bg-[var(--app-danger-tint)] px-8 py-12',
        className
      )}
    >
      <h3 className="text-[16px] font-medium text-[var(--app-fg-strong)]">{title}</h3>
      {description && (
        <p className="mt-2 max-w-[520px] text-[13px] text-[var(--app-fg-muted)]">{description}</p>
      )}
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-5" onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </div>
  )
}
