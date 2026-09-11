import { forwardRef } from 'react'
import { cn } from './cn'

const VARIANTS = {
  flat: 'bg-[var(--app-bg-2)] border border-[var(--app-border)]',
  raised: 'bg-[var(--app-bg-3)] border border-[var(--app-border)]',
  ghost: 'bg-transparent border border-[var(--app-hairline)]',
  outline: 'bg-transparent border border-[var(--app-border)]',
}

const PADDING = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
  xl: 'p-8',
}

export const Card = forwardRef(function Card(
  { as = 'div', variant = 'flat', padding = 'md', interactive, className, children, ...rest },
  ref
) {
  const Comp = as
  return (
    <Comp
      ref={ref}
      className={cn(
        'rounded-[var(--app-r-3)]',
        VARIANTS[variant],
        PADDING[padding],
        interactive &&
          'cursor-pointer transition-colors [transition-duration:var(--app-dur-2)] [transition-timing-function:var(--app-ease-out)] hover:border-[var(--app-border-strong)] hover:bg-[var(--app-bg-3)]',
        className
      )}
      {...rest}
    >
      {children}
    </Comp>
  )
})
