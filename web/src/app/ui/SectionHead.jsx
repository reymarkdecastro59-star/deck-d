import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { cn } from './cn'

/**
 * Section heading for the signed-in app — the same tier as Overview's
 * PanelHead (Title 20–22 / 600) so every page has the same three levels:
 * page title → section title → body. No per-section mono eyebrow (UX v2 R7);
 * a one-line `description` says what the section answers instead.
 */
export function SectionHead({
  title,
  description,
  id,
  viewAllTo,
  viewAllLabel = 'See all',
  aside,
  className,
}) {
  return (
    <div className={cn('mb-5 flex items-end justify-between gap-4', className)}>
      <div className="min-w-0">
        <h2
          id={id}
          className="text-[20px] font-semibold leading-tight tracking-[-0.015em] text-[var(--app-fg-strong)] sm:text-[22px]"
        >
          {title}
        </h2>
        {description && (
          <p className="app-wt-small mt-1 text-[14px] text-[var(--app-fg-muted)]">{description}</p>
        )}
      </div>
      {aside ? (
        <div className="shrink-0">{aside}</div>
      ) : viewAllTo ? (
        <Link
          to={viewAllTo}
          className="app-wt-small inline-flex shrink-0 items-center gap-1.5 rounded-[var(--app-r-1)] text-[14px] text-[var(--app-fg-muted)] transition-colors [transition-duration:var(--app-dur-1)] hover:text-[var(--app-fg)]"
        >
          {viewAllLabel}
          <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
        </Link>
      ) : null}
    </div>
  )
}
