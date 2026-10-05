import { cn } from './cn'
import { getLabelColor } from '@/app/design/tokens'

/**
 * Small pill for filters, session labels, meta tags.
 * - variant: neutral | accent | label | success | warning | danger
 * - selected: filter state
 * - label prop is used for session-label color coding
 */
export function Chip({
  variant = 'neutral',
  selected,
  label,
  as = 'span',
  className,
  children,
  ...rest
}) {
  const Comp = as

  // Session label chips get a color keyed off the label text.
  if (variant === 'label') {
    const c = getLabelColor(label || (typeof children === 'string' ? children : null))
    return (
      <Comp
        className={cn(
          'inline-flex h-7 items-center gap-1 rounded-[var(--app-r-pill)] px-3 text-[13px] font-medium',
          'border',
          className
        )}
        style={{
          color: c,
          borderColor: c + '44',
          background: c + '18',
        }}
        {...rest}
      >
        {children}
      </Comp>
    )
  }

  const base =
    'inline-flex h-8 items-center gap-1.5 px-3.5 rounded-[var(--app-r-pill)] text-[14px] font-medium border transition-colors [transition-duration:var(--app-dur-1)]'

  const styles = {
    neutral: selected
      ? 'text-[var(--app-fg)] bg-[var(--app-bg-3)] border-[var(--app-border-strong)]'
      : 'text-[var(--app-fg-muted)] bg-[var(--app-bg-2)] border-[var(--app-border)] hover:text-[var(--app-fg)]',
    accent: selected
      ? 'text-[var(--app-accent-hi)] bg-[var(--app-accent-tint)] border-[var(--app-accent-rail)]'
      : 'text-[var(--app-accent)] bg-transparent border-[var(--app-border)] hover:bg-[var(--app-accent-tint)]',
    success: 'text-[var(--app-ok)] bg-[var(--app-ok-tint)] border-transparent',
    warning: 'text-[var(--app-warn)] bg-[var(--app-warn-tint)] border-transparent',
    danger: 'text-[var(--app-danger)] bg-[var(--app-danger-tint)] border-transparent',
  }

  return (
    <Comp className={cn(base, styles[variant], className)} {...rest}>
      {children}
    </Comp>
  )
}
