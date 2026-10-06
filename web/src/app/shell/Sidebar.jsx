import { Link, NavLink } from 'react-router-dom'
import {
  ArrowRight,
  Flame,
  LayoutGrid,
  ListChecks,
  MonitorSmartphone,
  Settings,
} from 'lucide-react'
import { cn } from '@/app/ui/cn'
import { Art } from '@/app/ui/Art'
import { StageGlyph, Wordmark } from '@/app/ui/brand'
import { formatDuration } from '@/lib/format'
import { useTracking } from './trackingContext'
import { useElapsed } from './useElapsed'

/**
 * Sidebar v2 — a Surface-1 panel (common region) grouped by the product story:
 * Overview, then 01 Track / 02 Understand / 03 Recommend. Every item has an
 * icon; the active item gets a Signal tint, rail and weight change (never
 * colour alone). The bottom card ties the shell to what you're playing:
 * "Now playing" while the agent reports a live game, otherwise "Last session".
 */
const GROUPS = [
  {
    items: [
      { to: '/dashboard', label: 'Overview', icon: <StageGlyph name="overview" size={18} /> },
    ],
  },
  {
    label: 'Track',
    glyph: 'track',
    items: [
      {
        to: '/library',
        label: 'Library',
        icon: <LayoutGrid className="h-[18px] w-[18px]" strokeWidth={1.6} />,
      },
      {
        to: '/sessions',
        label: 'Sessions',
        icon: <ListChecks className="h-[18px] w-[18px]" strokeWidth={1.6} />,
      },
    ],
  },
  {
    label: 'Understand',
    glyph: 'understand',
    items: [{ to: '/stats', label: 'Stats', icon: <StageGlyph name="understand" size={18} /> }],
  },
  {
    label: 'Recommend',
    glyph: 'recommend',
    items: [
      { to: '/for-you', label: 'For You', icon: <StageGlyph name="recommend" size={18} /> },
      {
        to: '/trending',
        label: 'Trending',
        icon: <Flame className="h-[18px] w-[18px]" strokeWidth={1.6} />,
      },
    ],
  },
]

// Devices moves into Settings in phase L7; until then it lives beside Settings.
const SYSTEM = [
  {
    to: '/devices',
    label: 'Devices',
    icon: <MonitorSmartphone className="h-[18px] w-[18px]" strokeWidth={1.6} />,
  },
  {
    to: '/settings',
    label: 'Settings',
    icon: <Settings className="h-[18px] w-[18px]" strokeWidth={1.6} />,
  },
]

export function Sidebar() {
  return (
    <aside
      className="sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-[var(--app-hairline)] bg-[var(--app-bg-2)] md:flex"
      style={{ width: 'var(--app-sidebar-w)', zIndex: 'var(--app-z-sidebar)' }}
    >
      <div className="px-6 pb-5 pt-6">
        <Link
          to="/dashboard"
          aria-label="DECK'D, Overview"
          className="inline-flex rounded-[var(--app-r-1)]"
        >
          <Wordmark size={21} />
        </Link>
      </div>

      <nav aria-label="Primary" className="flex-1 overflow-y-auto px-3.5 pb-4">
        {GROUPS.map((g, i) => (
          <div key={g.label ?? i} className={cn(i > 0 && 'mt-6')}>
            {/* Group labels name the list (aria-labelledby), not destinations:
                plain text in the tertiary tone, no icon, so they never read as
                nav items. Not headings, so the page's h1 stays first. */}
            {g.label && (
              <div
                id={`nav-${g.glyph}`}
                className="mb-1 px-3 text-[13px] font-medium text-[var(--app-fg-dim)]"
              >
                {g.label}
              </div>
            )}
            <ul aria-labelledby={g.label ? `nav-${g.glyph}` : undefined} className="space-y-0.5">
              {g.items.map((item) => (
                <li key={item.to}>
                  <SidebarItem {...item} />
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div className="my-5 h-px bg-[var(--app-hairline)]" aria-hidden />
        <ul className="space-y-0.5">
          {SYSTEM.map((item) => (
            <li key={item.to}>
              <SidebarItem {...item} />
            </li>
          ))}
        </ul>
      </nav>

      <div className="px-3.5 pb-4">
        <SessionCard />
      </div>
    </aside>
  )
}

function SidebarItem({ to, label, icon }) {
  return (
    <NavLink
      to={to}
      end={to === '/dashboard'}
      className={({ isActive }) =>
        cn(
          'flex h-10 items-center gap-3 rounded-[var(--app-r-2)] px-3 text-[15px]',
          'transition-colors [transition-duration:var(--app-dur-1)]',
          isActive
            ? 'bg-[var(--app-accent-tint)] font-semibold text-[var(--app-fg-strong)] shadow-[inset_2px_0_0_var(--app-accent)]'
            : 'app-wt-small text-[var(--app-fg-muted)] hover:bg-[var(--app-bg-3)] hover:text-[var(--app-fg)]'
        )
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={cn(
              'inline-flex',
              isActive ? 'text-[var(--app-accent)]' : 'text-[var(--app-fg-dim)]'
            )}
          >
            {icon}
          </span>
          <span className="truncate">{label}</span>
        </>
      )}
    </NavLink>
  )
}

function SessionCard() {
  const { live, lastSession, sync } = useTracking()
  const elapsed = useElapsed(live?.started_at)

  if (!live && !lastSession) {
    if (sync.status === 'unknown') return null
    return (
      <div className="rounded-[var(--app-r-3)] border border-[var(--app-hairline)] bg-[var(--app-bg-3)] p-4">
        <div className="text-[13px] font-semibold text-[var(--app-fg)]">No sessions yet</div>
        <p className="mt-1 text-[13px] leading-[1.5] text-[var(--app-fg-muted)]">
          Install the tracker and your play shows up here.
        </p>
        <Link
          to="/devices"
          className="mt-3 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-[var(--app-r-2)] border border-[var(--app-border-strong)] text-[13px] font-medium text-[var(--app-fg)] hover:bg-[var(--app-bg-2)]"
        >
          Set up tracker
          <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
        </Link>
      </div>
    )
  }

  const name = live?.game_name ?? lastSession?.game_name ?? 'Unknown game'
  const ended = lastSession?.ended_at
    ? new Date(lastSession.ended_at * 1000).toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null

  return (
    <Link
      to="/sessions"
      className="block rounded-[var(--app-r-3)] border border-[var(--app-hairline)] bg-[var(--app-bg-3)] p-3.5 transition-colors [transition-duration:var(--app-dur-1)] hover:border-[var(--app-border)]"
      aria-label={live ? `Now playing ${name}` : `Last session: ${name}`}
    >
      {live ? (
        <div className="flex items-center gap-2 text-[13px] font-semibold text-[var(--app-accent)]">
          <span aria-hidden className="app-live-dot h-2 w-2 rounded-full bg-[var(--app-accent)]" />
          Now playing
        </div>
      ) : (
        <div className="text-[13px] font-semibold text-[var(--app-fg-muted)]">Last session</div>
      )}
      <div className="mt-2.5 flex items-center gap-3">
        <Art name={name} className="h-[53px] w-10 shrink-0 rounded-[4px]" />
        <div className="min-w-0">
          <div className="truncate text-[15px] font-semibold text-[var(--app-fg-strong)]">
            {name}
          </div>
          <div className="app-num text-[14px] text-[var(--app-fg)]">
            {formatDuration(live ? elapsed : lastSession?.duration_sec)}
          </div>
          <div className="app-wt-small truncate text-[13px] text-[var(--app-fg-muted)]">
            {live ? (live.device_name ?? 'Playing now') : ended ? `Ended ${ended}` : sync.label}
          </div>
        </div>
      </div>
    </Link>
  )
}
