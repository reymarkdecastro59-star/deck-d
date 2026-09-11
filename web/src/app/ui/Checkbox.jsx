import { cn } from './cn'

export function Checkbox({ checked, indeterminate, onChange, disabled, id, className, label }) {
  return (
    <label
      className={cn(
        'inline-flex select-none items-center gap-2.5',
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
      )}
    >
      <span
        className={cn(
          'relative inline-flex h-[16px] w-[16px] items-center justify-center rounded-[3px]',
          'border transition-colors [transition-duration:var(--app-dur-1)]',
          checked || indeterminate
            ? 'border-[var(--app-accent)] bg-[var(--app-accent)]'
            : 'border-[var(--app-border-strong)] bg-[var(--app-bg-2)]',
          className
        )}
      >
        <input
          id={id}
          type="checkbox"
          checked={!!checked}
          disabled={disabled}
          onChange={(e) => onChange?.(e.target.checked)}
          className="cursor-inherit absolute inset-0 opacity-0"
        />
        {indeterminate ? (
          <svg viewBox="0 0 10 2" className="h-[2px] w-2.5 fill-white">
            <rect width="10" height="2" />
          </svg>
        ) : checked ? (
          <svg viewBox="0 0 10 8" className="h-2 w-2.5 fill-none stroke-white" strokeWidth="1.6">
            <path d="M1 4 L4 7 L9 1" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : null}
      </span>
      {label && <span className="text-[13.5px] text-[var(--app-fg)]">{label}</span>}
    </label>
  )
}
