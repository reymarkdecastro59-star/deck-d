import { forwardRef } from 'react'
import { cn } from './cn'

/**
 * Native <select> in DECK'D chrome. Renders with a custom caret.
 * options: [{ value, label }]
 */
export const Select = forwardRef(function Select(
  { options, value, onChange, size = 'md', className, ...rest },
  ref
) {
  const h = size === 'sm' ? 'h-8 text-[13px] pl-3 pr-8' : 'h-10 text-[14px] pl-3.5 pr-9'
  return (
    <div className="relative inline-block">
      <select
        ref={ref}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className={cn(
          'appearance-none bg-[var(--app-bg-2)] text-[var(--app-fg)]',
          'rounded-[var(--app-r-2)] border border-[var(--app-border)]',
          'hover:border-[var(--app-border-strong)]',
          'focus:border-[var(--app-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--app-accent-ring)]',
          h,
          className
        )}
        {...rest}
      >
        {options.map((o) => (
          <option
            key={o.value}
            value={o.value}
            className="bg-[var(--app-bg-2)] text-[var(--app-fg)]"
          >
            {o.label}
          </option>
        ))}
      </select>
      <span
        aria-hidden
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--app-fg-muted)]"
      >
        <svg viewBox="0 0 12 8" className="h-2 w-3 fill-none stroke-current" strokeWidth="1.6">
          <path d="M1 1.5 L6 6.5 L11 1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </div>
  )
})
