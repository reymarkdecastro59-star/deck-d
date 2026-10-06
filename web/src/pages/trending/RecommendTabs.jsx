import { NavLink } from 'react-router-dom'
import { cn } from '@/app/ui/cn'

const TABS = [
  { to: '/for-you', label: 'For You' },
  { to: '/trending', label: 'Trending' },
]

/**
 * Switch between the two Recommend screens. The sidebar has both, but the
 * phone bottom bar has room for one Recommend tab, so this keeps Trending
 * one tap away there. Links (not a stateful toggle), so each has its URL.
 */
export function RecommendTabs({ base = '' }) {
  return (
    <nav
      aria-label="Recommendations"
      className="inline-flex h-10 items-center gap-0.5 rounded-[var(--app-r-2)] border border-[var(--app-border)] bg-[var(--app-bg-2)] p-0.5"
    >
      {TABS.map((t) => (
        <NavLink
          key={t.to}
          to={`${base}${t.to}`}
          className={({ isActive }) =>
            cn(
              'inline-flex h-full items-center rounded-[var(--app-r-1)] px-4 text-[14px] transition-colors [transition-duration:var(--app-dur-1)]',
              isActive
                ? 'bg-[var(--app-bg-3)] font-semibold text-[var(--app-fg-strong)]'
                : 'text-[var(--app-fg-muted)] hover:text-[var(--app-fg)]'
            )
          }
        >
          {t.label}
        </NavLink>
      ))}
    </nav>
  )
}
