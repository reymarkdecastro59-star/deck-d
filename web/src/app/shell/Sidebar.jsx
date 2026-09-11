import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Library,
  ListChecks,
  Sparkles,
  BarChart3,
  MonitorSmartphone,
  Settings,
} from 'lucide-react'
import { cn } from '@/app/ui/cn'
import { StatusPill } from './StatusPill'

const NAV = [
  { to: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { to: '/library', label: 'Library', Icon: Library },
  { to: '/sessions', label: 'Sessions', Icon: ListChecks },
  { to: '/recommendations', label: 'Recommendations', Icon: Sparkles },
  { to: '/stats', label: 'Stats', Icon: BarChart3 },
  { to: '/devices', label: 'Devices', Icon: MonitorSmartphone },
  { to: '/settings', label: 'Settings', Icon: Settings },
]

export function Sidebar() {
  return (
    <aside
      className="flex shrink-0 flex-col border-r border-[var(--app-border)] bg-[var(--app-bg-2)]"
      style={{ width: 'var(--app-sidebar-w)', zIndex: 'var(--app-z-sidebar)' }}
    >
      <div
        className="flex items-center border-b border-[var(--app-border)] px-5"
        style={{ height: 'var(--app-topbar-h)' }}
      >
        <NavLink to="/dashboard" className="group flex items-center gap-2">
          <span
            aria-hidden
            className="flex h-6 w-6 items-center justify-center rounded-[6px] bg-[var(--app-accent)] text-[11px] font-semibold text-white"
          >
            D
          </span>
          <span className="text-[14px] font-medium tracking-[0.14em] text-[var(--app-fg-strong)]">
            DECK<span className="text-[var(--app-accent)]">&apos;</span>D
          </span>
        </NavLink>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
        {NAV.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'group relative flex h-9 items-center gap-3 rounded-[var(--app-r-2)] pl-3 pr-3',
                'text-[13.5px] transition-colors [transition-duration:var(--app-dur-1)]',
                isActive
                  ? 'bg-[var(--app-accent-tint)] text-[var(--app-fg-strong)]'
                  : 'text-[var(--app-fg-muted)] hover:bg-[var(--app-bg-3)] hover:text-[var(--app-fg)]'
              )
            }
          >
            {({ isActive }) => (
              <>
                <span
                  aria-hidden
                  className={cn(
                    'absolute bottom-1.5 left-0 top-1.5 w-[2px] rounded-full',
                    isActive ? 'bg-[var(--app-accent)]' : 'bg-transparent'
                  )}
                />
                <Icon
                  className={cn(
                    'h-4 w-4 shrink-0',
                    isActive ? 'text-[var(--app-accent-hi)]' : 'text-current'
                  )}
                  strokeWidth={1.75}
                />
                <span className="truncate">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-[var(--app-border)] p-3">
        <StatusPill />
      </div>
    </aside>
  )
}
