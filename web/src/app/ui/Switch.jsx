import { cn } from './cn'

export function Switch({ checked, onChange, disabled, label, className, id }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full',
        'transition-colors [transition-duration:var(--app-dur-2)]',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-accent)]',
        checked
          ? 'bg-[var(--app-accent)]'
          : 'border border-[var(--app-border)] bg-[var(--app-bg-3)]',
        disabled && 'cursor-not-allowed opacity-40',
        className
      )}
    >
      <span
        aria-hidden
        className={cn(
          'inline-block h-4 w-4 rounded-full bg-white shadow',
          'transition-transform [transition-duration:var(--app-dur-2)] [transition-timing-function:var(--app-ease-out)]',
          checked ? 'translate-x-6' : 'translate-x-1'
        )}
      />
    </button>
  )
}
