import { forwardRef } from 'react'
import { cn } from './cn'

const SIZES = {
  sm: 'h-8 w-8   [&_svg]:h-4 [&_svg]:w-4',
  md: 'h-10 w-10 [&_svg]:h-5 [&_svg]:w-5',
  lg: 'h-12 w-12 [&_svg]:h-6 [&_svg]:w-6',
}

export const IconButton = forwardRef(function IconButton(
  { size = 'md', label, className, children, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex items-center justify-center rounded-[var(--app-r-2)]',
        'text-[var(--app-fg-muted)] hover:text-[var(--app-fg)]',
        'border border-transparent hover:border-[var(--app-border)] hover:bg-[var(--app-bg-2)]',
        'transition-colors [transition-duration:var(--app-dur-1)] [transition-timing-function:var(--app-ease-out)]',
        'disabled:cursor-not-allowed disabled:opacity-40',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-accent)]',
        SIZES[size],
        className
      )}
      {...rest}
    >
      {children}
    </button>
  )
})
