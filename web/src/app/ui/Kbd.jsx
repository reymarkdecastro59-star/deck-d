import { cn } from './cn'

export function Kbd({ children, className }) {
  return (
    <kbd
      className={cn(
        'inline-flex h-[22px] min-w-[22px] items-center justify-center px-1.5',
        'rounded-[4px] border border-[var(--app-border)] bg-[var(--app-bg-3)]',
        'app-num text-[11px] font-medium text-[var(--app-fg-muted)]',
        className
      )}
    >
      {children}
    </kbd>
  )
}
