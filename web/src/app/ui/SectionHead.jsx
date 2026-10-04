import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { cn } from './cn'

/**
 * Section heading used across the authenticated app. Deliberately quiet
 * because the sections it labels don't need a Card wrapper to feel like
 * groups — the eyebrow + heading + hairline rhythm carries structure.
 *
 * Props:
 *   eyebrow?    — small uppercase caption above the heading
 *   title       — section title
 *   viewAllTo?  — if set, renders a tertiary "See all" link on the right
 *   aside?      — arbitrary node in the right slot (takes precedence over viewAllTo)
 */
export function SectionHead({
  eyebrow,
  title,
  viewAllTo,
  viewAllLabel = 'See all',
  aside,
  className,
}) {
  return (
    <div className={cn('flex items-end justify-between gap-4', className)}>
      <div className="min-w-0">
        {eyebrow && (
          <div className="app-eyebrow text-[10px] text-[var(--app-fg-dim)]">{eyebrow}</div>
        )}
        <h2 className="mt-1 text-[15px] font-medium tracking-tight text-[var(--app-fg-strong)]">
          {title}
        </h2>
      </div>
      {aside ? (
        <div className="shrink-0">{aside}</div>
      ) : viewAllTo ? (
        <Link
          to={viewAllTo}
          className="inline-flex shrink-0 items-center gap-1 text-[12.5px] text-[var(--app-fg-muted)] transition-colors [transition-duration:var(--app-dur-1)] hover:text-[var(--app-fg)]"
        >
          {viewAllLabel}
          <ArrowRight className="h-3 w-3" strokeWidth={2} />
        </Link>
      ) : null}
    </div>
  )
}
