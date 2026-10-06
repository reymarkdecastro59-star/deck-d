import { forwardRef } from 'react'
import { cn } from './cn'

const SIZES = {
  sm: 'h-8  text-[13px] px-3',
  md: 'h-10 text-[14px] px-3.5',
  lg: 'h-12 text-[15px] px-4',
}

export const Input = forwardRef(function Input(
  { size = 'md', leadingIcon, trailingSlot, className, wrapperClassName, invalid, ...rest },
  ref
) {
  const hasSlots = leadingIcon || trailingSlot

  const field = (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        'w-full bg-transparent text-[var(--app-fg)] placeholder-[var(--app-fg-dim)]',
        'focus:outline-none disabled:cursor-not-allowed disabled:opacity-50',
        hasSlots
          ? 'h-full pl-0 pr-0'
          : cn(
              SIZES[size],
              'rounded-[var(--app-r-2)] border border-[var(--app-border)] focus:border-[var(--app-accent)] focus:ring-2 focus:ring-[var(--app-accent-ring)]',
              invalid && 'border-[var(--app-danger)]'
            ),
        className
      )}
      {...rest}
    />
  )

  if (!hasSlots) return field

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-[var(--app-r-2)] border border-[var(--app-border)]',
        'bg-[var(--app-bg-2)] px-3.5',
        'focus-within:border-[var(--app-accent)] focus-within:ring-2 focus-within:ring-[var(--app-accent-ring)]',
        invalid && 'border-[var(--app-danger)] focus-within:border-[var(--app-danger)]',
        SIZES[size],
        wrapperClassName
      )}
    >
      {leadingIcon && (
        <span className="shrink-0 text-[var(--app-fg-dim)] [&>svg]:h-4 [&>svg]:w-4">
          {leadingIcon}
        </span>
      )}
      {field}
      {trailingSlot && <span className="shrink-0 text-[var(--app-fg-dim)]">{trailingSlot}</span>}
    </div>
  )
})
