import { cn } from './cn'

export function Skeleton({ className, style, ...rest }) {
  return (
    <div
      aria-hidden
      className={cn('animate-pulse rounded-[var(--app-r-2)] bg-[var(--app-bg-3)]', className)}
      style={style}
      {...rest}
    />
  )
}

export function SkeletonText({ lines = 3, className }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className="h-3" style={{ width: `${100 - i * 12}%` }} />
      ))}
    </div>
  )
}
