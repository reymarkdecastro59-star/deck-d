import { cn } from './cn'

export function Divider({ orientation = 'horizontal', className }) {
  if (orientation === 'vertical') {
    return (
      <span
        aria-hidden
        className={cn('inline-block h-full w-px bg-[var(--app-hairline)]', className)}
      />
    )
  }
  return <hr aria-hidden className={cn('h-px border-0 bg-[var(--app-hairline)]', className)} />
}
