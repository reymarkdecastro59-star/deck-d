import { NavLink } from 'react-router-dom'
import { LayoutGrid, ListChecks } from 'lucide-react'
import { StageGlyph } from '@/app/ui/brand'
import { cn } from '@/app/ui/cn'

/**
 * Bottom tab bar shown only on compact widths (< md). Preserves the five
 * primary destinations. Utilities (Devices, Settings, Sign out) move to the
 * UserMenu on this width so the tab bar keeps the same information priority
 * as the desktop sidebar. Sits above the safe-area inset on iOS.
 */
const glyph = (name) =>
  function Glyph({ className }) {
    return <StageGlyph name={name} size={20} className={className} />
  }

const NAV = [
  { to: '/dashboard', label: 'Overview', Icon: glyph('overview') },
  { to: '/library', label: 'Library', Icon: LayoutGrid },
  { to: '/sessions', label: 'Sessions', Icon: ListChecks },
  { to: '/stats', label: 'Stats', Icon: glyph('understand') },
  { to: '/for-you', label: 'For You', Icon: glyph('recommend') },
]

export function BottomNav() {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 border-t border-[var(--app-hairline)] bg-[var(--app-bg-2)] md:hidden"
      style={{
        zIndex: 'var(--app-z-sidebar)',
        paddingBottom: 'env(safe-area-inset-bottom, 0)',
      }}
    >
      <ul className="flex h-[60px] items-stretch">
        {NAV.map((item) => (
          <li key={item.to} className="flex-1">
            <BottomNavItem {...item} />
          </li>
        ))}
      </ul>
    </nav>
  )
}

function BottomNavItem({ to, label, Icon }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'group relative flex h-full min-h-[44px] flex-col items-center justify-center gap-1',
          'text-[12px] leading-none transition-colors [transition-duration:var(--app-dur-1)]',
          isActive
            ? 'font-semibold text-[var(--app-fg-strong)]'
            : 'app-wt-small text-[var(--app-fg-muted)]'
        )
      }
      end={to === '/dashboard'}
    >
      {({ isActive }) => (
        <>
          <span
            className={cn(
              'inline-flex rounded-full px-3.5 py-0.5',
              isActive
                ? 'bg-[var(--app-accent-tint)] text-[var(--app-accent)]'
                : 'text-[var(--app-fg-dim)]'
            )}
          >
            <Icon className="h-[20px] w-[20px]" strokeWidth={1.6} />
          </span>
          <span className="truncate">{label}</span>
        </>
      )}
    </NavLink>
  )
}
