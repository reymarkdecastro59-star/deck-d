import { useMemo } from 'react'
import {
  ArrowRight,
  BarChart3,
  Clock,
  Download,
  Flame,
  Gamepad2,
  LayoutGrid,
  Plus,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { Card } from '@/app/ui/Card'
import { ErrorState } from '@/app/ui/ErrorState'
import { Skeleton } from '@/app/ui/Skeleton'
import { KPITile } from '@/app/viz'
import { coverBackgroundStyle } from '@/app/ui/safeUrl'
import { formatDuration, formatHours, relativeTime } from '@/lib/format'
import { getLabelColor } from '@/app/design/tokens'
import { useDashboard } from './useDashboard'
import bgLanding from '@/assets/Bg_Landing.png'
import logo from "@/assets/Deck'D.png"

/**
 * Best-effort display name from an email like "reymarkdecastro59@x.com".
 * Strips trailing digits (birth-year style suffixes) and truncates to a
 * reasonable length so the greeting stays scannable. Cognito doesn't
 * carry a preferred_name claim in this app — a future profile record
 * with a real display name would replace this heuristic.
 */
function firstName(email) {
  if (!email) return 'there'
  const local = email.split('@')[0].replace(/[0-9]+$/, '')
  if (!local) return 'there'
  // Long email-prefix names ("reymarkdecastro") almost always concatenate
  // multiple words; take the first ~7 chars as a best-guess first name.
  const capped = local.length > 12 ? local.slice(0, 7) : local
  return capped.charAt(0).toUpperCase() + capped.slice(1)
}

// Count unique tracked games across all recent sessions. The summary
// endpoint gives ranked games but doesn't expose an all-time distinct
// count separately, so we compose it here.
function distinctGames(summary) {
  return (summary?.games || []).length
}

// Streak: consecutive days with at least one session, ending today.
// Simple client-side derivation from `recent` so we don't invent a
// backend field. Returns 0 for empty input.
function currentStreak(recent) {
  if (!recent || recent.length === 0) return 0
  const days = new Set(
    recent.map((s) => {
      const d = new Date(s.started_at * 1000)
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    })
  )
  let streak = 0
  const cursor = new Date()
  cursor.setHours(0, 0, 0, 0)
  while (true) {
    const key = `${cursor.getFullYear()}-${cursor.getMonth()}-${cursor.getDate()}`
    if (!days.has(key)) break
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

export default function Dashboard() {
  const { email } = useAuth()
  const { summary, recent, loading, error, reload } = useDashboard()
  const name = firstName(email)

  // Hooks must run unconditionally, so all derivations sit above the
  // loading / error / empty branches.
  const streak = useMemo(() => currentStreak(recent), [recent])

  if (loading) return <DashboardSkeleton name={name} />
  if (error) {
    return (
      <PageContainer>
        <DashboardHero name={name} />
        <ErrorState title="We couldn't load your dashboard" description={error} onRetry={reload} />
      </PageContainer>
    )
  }

  const totalSessions = summary?.total_sessions ?? 0
  const isEmpty = totalSessions === 0
  const games = distinctGames(summary)
  const topGames = (summary?.games || []).slice(0, 5)

  return (
    <PageContainer>
      <DashboardHero name={name} />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KPITile
          icon={<Gamepad2 className="h-4 w-4" strokeWidth={1.75} />}
          label="Total Playtime"
          value={isEmpty ? null : formatHours(summary.total_hours)}
          unit="h"
          footnote={isEmpty ? 'No sessions yet' : 'Overlap stripped — nothing double-counted.'}
        />
        <KPITile
          icon={<BarChart3 className="h-4 w-4" strokeWidth={1.75} />}
          label="Sessions"
          value={isEmpty ? null : totalSessions.toLocaleString()}
          footnote={
            isEmpty ? 'Nothing recorded' : 'Every recorded play — manual or from the tracker.'
          }
        />
        <KPITile
          icon={<LayoutGrid className="h-4 w-4" strokeWidth={1.75} />}
          label="Games Played"
          value={games === 0 ? null : games.toLocaleString()}
          footnote={games === 0 ? 'No tracked games' : 'Distinct titles with a resolved match.'}
        />
        <KPITile
          icon={<Flame className="h-4 w-4" strokeWidth={1.75} />}
          label="Current Streak"
          value={streak === 0 ? null : streak}
          unit={streak === 1 ? 'day' : 'days'}
          footnote={
            streak === 0 ? 'Start playing to build your streak' : 'Consecutive days ending today.'
          }
        />
      </section>

      {isEmpty ? <GetStartedCard /> : null}

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RecentSessionsPanel recent={recent} isEmpty={isEmpty} />
        <MostPlayedGamesPanel topGames={topGames} isEmpty={games === 0} />
      </section>
    </PageContainer>
  )
}

// ─── Layout primitives ─────────────────────────────────────────────

function PageContainer({ children }) {
  return (
    <div
      className="mx-auto w-full space-y-8 px-8 py-8 lg:px-10"
      style={{ maxWidth: 'var(--app-content-max)' }}
    >
      {children}
    </div>
  )
}

// ─── Hero ──────────────────────────────────────────────────────────

function DashboardHero({ name }) {
  return (
    <section className="relative isolate overflow-hidden rounded-[var(--app-r-4)] border border-[var(--app-border)] bg-[var(--app-bg-2)]">
      {/* Landing photography anchored to the right, masked toward the
          left so it never touches the headline. Low saturation + heavy
          fade keeps it environmental, not decorative. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 hidden w-[62%] md:block"
      >
        <img
          src={bgLanding}
          alt=""
          className="h-full w-full object-cover object-right"
          style={{
            opacity: 0.45,
            filter: 'saturate(0.55) brightness(0.85)',
            maskImage: 'linear-gradient(to left, black 40%, rgba(0,0,0,0.5) 70%, transparent 100%)',
            WebkitMaskImage:
              'linear-gradient(to left, black 40%, rgba(0,0,0,0.5) 70%, transparent 100%)',
          }}
        />
      </div>

      {/* Right-edge microcopy — mirrors landing's editorial voice. */}
      <div
        aria-hidden
        className="pointer-events-none absolute right-8 top-8 hidden text-right text-[10px] uppercase leading-[1.6] tracking-[0.28em] text-[var(--app-fg-muted)] lg:block"
        style={{ fontFamily: 'var(--app-font-display)' }}
      >
        Games
        <br />
        Build a
        <br />
        Brighter You
      </div>

      <div className="relative z-10 px-8 py-10 lg:px-10 lg:py-12">
        <div
          className="app-eyebrow text-[10.5px] text-[var(--app-fg-muted)]"
          style={{ letterSpacing: '0.22em' }}
        >
          Dashboard
        </div>
        <h1
          className="mt-4 font-normal leading-[1.05] tracking-tight text-[var(--app-fg-strong)]"
          style={{ fontSize: 'clamp(32px, 3.6vw, 44px)' }}
        >
          Welcome back, {name}.
        </h1>
        <p className="mt-3 max-w-[540px] text-[14px] leading-relaxed text-[var(--app-fg-muted)]">
          Track your games, understand your play, and discover what deserves your time next.
        </p>
      </div>
    </section>
  )
}

// ─── Get Started (empty dashboard) ────────────────────────────────

function GetStartedCard() {
  return (
    <section className="relative isolate overflow-hidden rounded-[var(--app-r-4)] border border-[var(--app-border)] bg-[var(--app-bg-2)]">
      {/* Right-side brand object — official DECK'D mark scaled up as an
          atmospheric element. Sits at low opacity so it complements the
          copy rather than competing with it. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 hidden w-[52%] items-center justify-end md:flex"
      >
        <img
          src={logo}
          alt=""
          className="h-[260px] max-h-full select-none pr-10 lg:h-[300px]"
          style={{
            opacity: 0.9,
            filter: 'drop-shadow(0 24px 60px rgba(0,0,0,0.55))',
          }}
          draggable={false}
        />
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute right-8 top-8 hidden text-right text-[10px] uppercase leading-[1.6] tracking-[0.28em] text-[var(--app-fg-muted)] lg:block"
        style={{ fontFamily: 'var(--app-font-display)' }}
      >
        Track
        <br />
        Discover
        <br />
        Improve
      </div>

      <div className="relative z-10 max-w-[560px] px-8 py-10 lg:px-10 lg:py-12">
        <div
          className="app-eyebrow text-[10.5px] text-[var(--app-fg-muted)]"
          style={{ letterSpacing: '0.22em' }}
        >
          Get Started
        </div>
        <h2
          className="mt-3 font-normal leading-[1.1] tracking-tight text-[var(--app-fg-strong)]"
          style={{ fontSize: 'clamp(24px, 2.2vw, 30px)' }}
        >
          Your first session starts here.
        </h2>
        <p className="mt-3 text-[14px] leading-relaxed text-[var(--app-fg-muted)]">
          DECK&apos;D shows you the calm truth about your gaming habits. Install the tracker to
          automatically capture your play sessions, or log one manually.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link
            to="/devices"
            className="inline-flex h-10 items-center gap-2 rounded-[var(--app-r-2)] bg-[var(--app-accent)] px-4 text-[13.5px] font-medium text-white transition-colors [transition-duration:var(--app-dur-1)] hover:bg-[var(--app-accent-hi)]"
          >
            <Download className="h-4 w-4" strokeWidth={2} />
            Install tracker
          </Link>
          <Link
            to="/sessions"
            className="inline-flex h-10 items-center gap-1.5 rounded-[var(--app-r-2)] px-3 text-[13.5px] text-[var(--app-fg-muted)] transition-colors [transition-duration:var(--app-dur-1)] hover:text-[var(--app-fg)]"
          >
            Log a session manually
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
          </Link>
        </div>
      </div>
    </section>
  )
}

// ─── Recent Sessions panel ────────────────────────────────────────

function RecentSessionsPanel({ recent, isEmpty }) {
  return (
    <Card padding="none" className="overflow-hidden">
      <PanelHeader title="Recent Sessions" to="/sessions" />
      {isEmpty || recent.length === 0 ? (
        <PanelEmpty
          icon={<Clock className="h-6 w-6" strokeWidth={1.5} />}
          title="No sessions yet"
          description="Once you start playing, your recent sessions will appear here."
        />
      ) : (
        <ul className="divide-y divide-[var(--app-hairline)]">
          {recent.slice(0, 6).map((s) => {
            const dot = getLabelColor(s.label)
            return (
              <li key={s.session_id} className="flex items-center gap-3 px-5 py-3.5">
                <span
                  aria-hidden
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: dot }}
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] text-[var(--app-fg)]">{s.game_name}</div>
                  <div className="app-num mt-0.5 text-[11.5px] text-[var(--app-fg-dim)]">
                    {relativeTime(s.started_at)} · {formatDuration(s.duration_sec)}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}

// ─── Most Played Games panel ──────────────────────────────────────

function MostPlayedGamesPanel({ topGames, isEmpty }) {
  return (
    <Card padding="none" className="overflow-hidden">
      <PanelHeader title="Most Played Games" to="/library" />
      {isEmpty ? (
        <PanelEmpty
          icon={<LayoutGrid className="h-6 w-6" strokeWidth={1.5} />}
          title="No games yet"
          description="Your most played games will appear here after DECK'D records some sessions."
        />
      ) : (
        <ul className="divide-y divide-[var(--app-hairline)]">
          {topGames.map((g, i) => (
            <li
              key={g.rawg_id ?? g.slug ?? g.game ?? i}
              className="flex items-center gap-3 px-5 py-3"
            >
              <span className="app-num w-5 shrink-0 text-right text-[12px] text-[var(--app-fg-dim)]">
                {i + 1}
              </span>
              <div
                aria-hidden
                className="h-10 w-14 shrink-0 overflow-hidden rounded-[var(--app-r-1)] border border-[var(--app-hairline)] bg-[var(--app-bg-3)]"
                style={coverBackgroundStyle(g.background_image)}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13.5px] text-[var(--app-fg)]">{g.game}</div>
              </div>
              <div className="app-num shrink-0 text-[13px] text-[var(--app-fg-strong)]">
                {formatHours(g.total_hours)}
                <span className="text-[11px] text-[var(--app-fg-muted)]"> h</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

function PanelHeader({ title, to }) {
  return (
    <div className="flex items-center justify-between px-5 py-4">
      <h2 className="text-[15px] font-medium text-[var(--app-fg-strong)]">{title}</h2>
      {to && (
        <Link
          to={to}
          className="inline-flex items-center gap-1 text-[12.5px] text-[var(--app-fg-muted)] transition-colors hover:text-[var(--app-accent-hi)]"
        >
          View all
          <ArrowRight className="h-3 w-3" strokeWidth={2} />
        </Link>
      )}
    </div>
  )
}

function PanelEmpty({ icon, title, description }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-3 text-[var(--app-fg-dim)]">{icon}</div>
      <div className="text-[13.5px] font-medium text-[var(--app-fg)]">{title}</div>
      <p className="mt-1.5 max-w-[280px] text-[12.5px] leading-relaxed text-[var(--app-fg-muted)]">
        {description}
      </p>
    </div>
  )
}

// ─── Loading skeleton ─────────────────────────────────────────────

function DashboardSkeleton({ name }) {
  return (
    <PageContainer>
      <div className="rounded-[var(--app-r-4)] border border-[var(--app-border)] bg-[var(--app-bg-2)] px-8 py-10 lg:px-10 lg:py-12">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-4 h-10 w-96" />
        <Skeleton className="mt-3 h-4 w-3/4 max-w-[440px]" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-[var(--app-r-3)] border border-[var(--app-border)] bg-[var(--app-bg-2)] p-5"
          >
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-4 h-9 w-24" />
            <Skeleton className="mt-3 h-3 w-full" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Skeleton className="h-56" />
        <Skeleton className="h-56" />
      </div>
      <span className="sr-only">Loading dashboard for {name}</span>
    </PageContainer>
  )
}
