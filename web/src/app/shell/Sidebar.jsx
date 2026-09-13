import { Link, NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Library,
  ListChecks,
  Sparkles,
  BarChart3,
  MonitorSmartphone,
  Settings,
  ArrowRight,
} from 'lucide-react'
import { cn } from '@/app/ui/cn'
import { useTrackerStatus } from './useTrackerStatus'
import logo from "@/assets/Deck'D.png"

const NAV = [
  { to: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { to: '/library', label: 'Library', Icon: Library },
  { to: '/sessions', label: 'Sessions', Icon: ListChecks },
  { to: '/recommendations', label: 'Recommendations', Icon: Sparkles },
  { to: '/stats', label: 'Stats', Icon: BarChart3 },
  { to: '/devices', label: 'Devices', Icon: MonitorSmartphone },
]

const UTIL = [{ to: '/settings', label: 'Settings', Icon: Settings }]

export function Sidebar() {
  return (
    <aside
      className="flex shrink-0 flex-col border-r border-[var(--app-border)] bg-[var(--app-bg-2)]"
      style={{ width: 'var(--app-sidebar-w)', zIndex: 'var(--app-z-sidebar)' }}
    >
      {/* Brand — official logo + wordmark. Comfortable breathing room. */}
      <div className="px-6 pb-4 pt-6">
        <Link
          to="/dashboard"
          className="group flex items-center gap-3 focus-visible:outline-none"
          aria-label="DECK'D — go to dashboard"
        >
          <img src={logo} alt="" className="h-9 w-9 shrink-0 select-none" draggable={false} />
          <span
            className="text-[15px] font-medium tracking-[0.22em] text-[var(--app-fg-strong)]"
            style={{ fontFamily: 'var(--app-font-display)' }}
          >
            DECK<span className="text-[var(--app-accent)]">&apos;</span>D
          </span>
        </Link>
      </div>

      {/* Primary nav */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {NAV.map((item) => (
          <SidebarItem key={item.to} {...item} />
        ))}

        <div className="my-4 h-px bg-[var(--app-hairline)]" aria-hidden />

        {UTIL.map((item) => (
          <SidebarItem key={item.to} {...item} />
        ))}
      </nav>

      {/* Tracker status card — real state from useTrackerStatus. */}
      <div className="px-3 pb-3">
        <TrackerCard />
      </div>

      {/* Brand footer microcopy — mirrors landing's editorial tone. */}
      <div
        className="border-t border-[var(--app-hairline)] px-6 py-3 text-[10px] uppercase leading-[1.6] tracking-[0.22em] text-[var(--app-fg-dim)]"
        style={{ fontFamily: 'var(--app-font-display)' }}
      >
        DECK<span className="text-[var(--app-fg-muted)]">&apos;</span>D
        <br />
        PLAY MORE
        <br />
        LIVE HIGHER
      </div>
    </aside>
  )
}

function SidebarItem({ to, label, Icon }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'group relative flex h-10 items-center gap-3 rounded-[var(--app-r-2)] px-3',
          'text-[13.5px] transition-colors [transition-duration:var(--app-dur-1)]',
          isActive
            ? 'bg-[var(--app-bg-3)] text-[var(--app-fg-strong)]'
            : 'hover:bg-[var(--app-bg-3)]/60 text-[var(--app-fg-muted)] hover:text-[var(--app-fg)]'
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span
              aria-hidden
              className="absolute inset-y-2 left-0 w-[2px] rounded-full bg-[var(--app-accent)]"
            />
          )}
          <Icon
            className={cn(
              'h-[18px] w-[18px] shrink-0',
              isActive ? 'text-[var(--app-fg-strong)]' : 'text-current'
            )}
            strokeWidth={isActive ? 2 : 1.75}
          />
          <span className="truncate">{label}</span>
        </>
      )}
    </NavLink>
  )
}

function TrackerCard() {
  const { status, label } = useTrackerStatus()
  const isOnline = status === 'online'

  const dotClass =
    status === 'online'
      ? 'bg-[var(--app-ok)]'
      : status === 'offline'
        ? 'bg-[var(--app-fg-dim)]'
        : 'bg-[var(--app-warn)]'

  return (
    <div
      className="rounded-[var(--app-r-3)] border border-[var(--app-border)] bg-[var(--app-bg-3)] p-4"
      role="status"
      aria-live="polite"
    >
      <div
        className="app-eyebrow text-[10px] text-[var(--app-fg-muted)]"
        style={{ letterSpacing: '0.22em' }}
      >
        Tracker
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span aria-hidden className={cn('h-1.5 w-1.5 shrink-0 rounded-full', dotClass)} />
        <span className="text-[12.5px] text-[var(--app-fg)]">{label ?? 'Unknown'}</span>
      </div>
      {!isOnline && (
        <>
          <p className="mt-2 text-[11.5px] leading-[1.5] text-[var(--app-fg-muted)]">
            Install the tracker to automatically log your gameplay.
          </p>
          <Link
            to="/devices"
            className={cn(
              'mt-3 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-[var(--app-r-2)]',
              'border border-[var(--app-border)] bg-[var(--app-bg-2)] text-[12px] text-[var(--app-fg)]',
              'transition-colors [transition-duration:var(--app-dur-1)]',
              'hover:border-[var(--app-border-strong)] hover:bg-[var(--app-bg-raised)]'
            )}
          >
            Set up tracker
            <ArrowRight className="h-3 w-3" strokeWidth={2} />
          </Link>
        </>
      )}
    </div>
  )
}
