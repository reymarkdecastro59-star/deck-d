import { forwardRef } from 'react'
import { cn } from './cn'

const VARIANTS = {
  primary:
    'bg-[var(--app-accent)] text-white hover:bg-[var(--app-accent-hi)] active:bg-[var(--app-accent-lo)] border border-transparent',
  secondary:
    'bg-[var(--app-bg-2)] text-[var(--app-fg)] hover:bg-[var(--app-bg-3)] border border-[var(--app-border)] hover:border-[var(--app-border-strong)]',
  ghost:
    'bg-transparent text-[var(--app-fg-muted)] hover:text-[var(--app-fg)] hover:bg-[var(--app-bg-2)] border border-transparent',
  danger:
    'bg-transparent text-[var(--app-danger)] hover:bg-[var(--app-danger-tint)] border border-[var(--app-border)] hover:border-[var(--app-danger)]',
  quiet:
    'bg-transparent text-[var(--app-fg-muted)] hover:text-[var(--app-fg)] border border-transparent underline-offset-4 hover:underline',
}

const SIZES = {
  sm: 'h-8  px-3   text-[13px] gap-1.5 rounded-[var(--app-r-2)]',
  md: 'h-10 px-4   text-[14px] gap-2   rounded-[var(--app-r-2)]',
  lg: 'h-12 px-5   text-[15px] gap-2   rounded-[var(--app-r-3)]',
}

export const Button = forwardRef(function Button(
  {
    as = 'button',
    variant = 'secondary',
    size = 'md',
    loading,
    leadingIcon,
    trailingIcon,
    className,
    children,
    disabled,
    ...rest
  },
  ref
) {
  const Comp = as
  return (
    <Comp
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap font-medium',
        'transition-colors [transition-duration:var(--app-dur-1)] [transition-timing-function:var(--app-ease-out)]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-accent)]',
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...rest}
    >
      {loading ? <span className="app-num opacity-70">…</span> : leadingIcon}
      {children}
      {!loading && trailingIcon}
    </Comp>
  )
})
