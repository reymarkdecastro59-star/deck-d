import { Activity, Download, Gamepad2, Info, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { Button } from '@/app/ui/Button'
import { Card } from '@/app/ui/Card'
import { EmptyState } from '@/app/ui/EmptyState'
import { ErrorState } from '@/app/ui/ErrorState'
import { Skeleton } from '@/app/ui/Skeleton'
import { BarChart, KPITile, MomentumBar } from '@/app/viz'
import { coverBackgroundStyle } from '@/app/ui/safeUrl'
import { formatDuration, formatHours, relativeTime } from '@/lib/format'
import { useDashboard } from './useDashboard'
import { weeklyBuckets } from './weeklyBuckets'
import { getLabelColor } from '@/app/design/tokens'

const HOUR_UNIT = 'h'

function firstName(email) {
  if (!email) return 'there'
  const local = email.split('@')[0]
  return local.charAt(0).toUpperCase() + local.slice(1)
}

export default function Dashboard() {
  const { email } = useAuth()
  const { summary, recent, loading, error, reload } = useDashboard()

  if (loading) return <DashboardSkeleton name={firstName(email)} />
  if (error) {
    return (
      <div className="mx-auto max-w-[1280px] px-8 py-8">
        <ErrorState title="We couldn't load your dashboard" description={error} onRetry={reload} />
      </div>
    )
  }

  const total = summary?.total_sessions ?? 0
  if (total === 0) return <DashboardEmpty name={firstName(email)} />

  return <DashboardPopulated name={firstName(email)} summary={summary} recent={recent} />
}

function DashboardEmpty({ name }) {
  return (
    <div className="mx-auto max-w-[1280px] px-8 py-8">
      <header className="mb-8">
        <div className="app-eyebrow text-[var(--app-fg-muted)]">Dashboard</div>
        <h1
          className="mt-2 font-normal tracking-tight text-[var(--app-fg-strong)]"
          style={{ fontSize: 'clamp(24px, 2.4vw, 32px)', lineHeight: 1.1 }}
        >
          Welcome, {name}.
        </h1>
        <p className="mt-2 max-w-[540px] text-[14px] text-[var(--app-fg-muted)]">
          Your dashboard is waiting for your first session. Install the tracker and launch a game —
          nothing shows up here until real data lands.
        </p>
      </header>

      <EmptyState
        icon={<Gamepad2 className="h-8 w-8" strokeWidth={1.5} />}
        title="No sessions yet"
        description="DECK'D shows you the calm truth about your gaming habits. Once the tracker logs your first play, this page fills in with hours, momentum, and top games."
        action={
          <div className="flex items-center gap-2">
            <Button
              as={Link}
              to="/devices"
              variant="primary"
              leadingIcon={<Download className="h-4 w-4" />}
            >
              Install tracker
            </Button>
            <Button as={Link} to="/sessions" variant="quiet">
              Log a session manually
            </Button>
          </div>
        }
      />
    </div>
  )
}

function DashboardPopulated({ name, summary, recent }) {
  const topGames = (summary.games || []).slice(0, 6)
  const maxDecay = Math.max(0.0001, ...topGames.map((g) => g.decay_hours))
  const buckets = weeklyBuckets(recent)
  const weeklyTotal = buckets.reduce((sum, b) => sum + b.value, 0)

  return (
    <div className="mx-auto max-w-[1280px] space-y-8 px-8 py-8">
      <header>
        <div className="app-eyebrow text-[var(--app-fg-muted)]">Dashboard</div>
        <h1
          className="mt-2 font-normal tracking-tight text-[var(--app-fg-strong)]"
          style={{ fontSize: 'clamp(24px, 2.4vw, 32px)', lineHeight: 1.1 }}
        >
          Welcome back, {name}.
        </h1>
        <p className="mt-2 text-[14px] text-[var(--app-fg-muted)]">
          {summary.total_sessions.toLocaleString()} session{summary.total_sessions === 1 ? '' : 's'}{' '}
          tracked to date.
        </p>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KPITile
          label="Hours played"
          value={formatHours(summary.total_hours)}
          unit={HOUR_UNIT}
          footnote="Wall-clock union — overlap stripped so nothing is double-counted."
        />
        <KPITile
          label="Momentum"
          value={formatHours(summary.decay_hours)}
          unit={HOUR_UNIT}
          footnote={`Decay-weighted with a ${summary.half_life_days}-day half-life. Older sessions fade.`}
        />
        <KPITile
          label="Sessions"
          value={summary.total_sessions.toLocaleString()}
          footnote="Every recorded play — manual or from the tracker."
        />
        <KPITile
          label="Overlap stripped"
          value={formatHours(summary.overlap_stripped_hours)}
          unit={HOUR_UNIT}
          tone="warn"
          footnote="Hours the raw sum double-counted before deduping (same game, two devices)."
        />
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card padding="none" className="overflow-hidden lg:col-span-2">
          <div className="flex items-center justify-between border-b border-[var(--app-border)] p-5">
            <div>
              <div className="app-eyebrow text-[var(--app-fg-muted)]">Top games</div>
              <p className="mt-1 text-[13px] text-[var(--app-fg-muted)]">
                Ranked by momentum. Recent sessions weigh more.
              </p>
            </div>
            <Link
              to="/library"
              className="text-[13px] text-[var(--app-fg-muted)] transition-colors hover:text-[var(--app-fg)]"
            >
              View library →
            </Link>
          </div>
          {topGames.length === 0 ? (
            <div className="p-8 text-[13.5px] text-[var(--app-fg-muted)]">No games ranked yet.</div>
          ) : (
            <ol className="divide-y divide-[var(--app-hairline)]">
              {topGames.map((g, i) => (
                <li
                  key={g.rawg_id ?? g.slug ?? g.game ?? i}
                  className="flex items-center gap-4 p-4"
                >
                  <span className="app-num w-6 shrink-0 text-right text-[13px] text-[var(--app-fg-dim)]">
                    {i + 1}
                  </span>
                  <div
                    aria-hidden
                    className="h-10 w-14 shrink-0 overflow-hidden rounded-[var(--app-r-2)] border border-[var(--app-hairline)] bg-[var(--app-bg-3)]"
                    style={coverBackgroundStyle(g.background_image)}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] text-[var(--app-fg)]">{g.game}</div>
                    <MomentumBar value={g.decay_hours} max={maxDecay} className="mt-2" />
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="app-num text-[14px] text-[var(--app-fg-strong)]">
                      {formatHours(g.total_hours)}
                      <span className="text-[12px] text-[var(--app-fg-muted)]"> h</span>
                    </div>
                    <div className="app-num mt-0.5 text-[11px] text-[var(--app-fg-dim)]">
                      {formatHours(g.decay_hours)}h momentum
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Card>

        <div className="space-y-6">
          <Card>
            <div className="flex items-start justify-between">
              <div>
                <div className="app-eyebrow text-[var(--app-fg-muted)]">This week</div>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span
                    className="app-num leading-none text-[var(--app-fg-strong)]"
                    style={{ fontSize: 'clamp(22px, 1.8vw, 26px)' }}
                  >
                    {formatHours(weeklyTotal)}
                  </span>
                  <span className="text-[13px] text-[var(--app-fg-muted)]">h</span>
                </div>
              </div>
              <TrendingUp className="h-4 w-4 text-[var(--app-fg-dim)]" strokeWidth={1.75} />
            </div>
            <div className="mt-4">
              <BarChart data={buckets} ariaLabel="Hours played per day, last 7 days" />
            </div>
          </Card>

          <Card padding="none" className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-[var(--app-border)] p-4">
              <div className="app-eyebrow text-[var(--app-fg-muted)]">Recent sessions</div>
              <Link
                to="/sessions"
                className="text-[12px] text-[var(--app-fg-muted)] transition-colors hover:text-[var(--app-fg)]"
              >
                All →
              </Link>
            </div>
            {recent.length === 0 ? (
              <div className="p-5 text-[13px] text-[var(--app-fg-muted)]">
                Nothing recorded yet.
              </div>
            ) : (
              <ul className="divide-y divide-[var(--app-hairline)]">
                {recent.slice(0, 6).map((s) => {
                  const dot = getLabelColor(s.label)
                  return (
                    <li key={s.session_id} className="flex items-center gap-3 p-4">
                      <span
                        aria-hidden
                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ background: dot }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13.5px] text-[var(--app-fg)]">
                          {s.game_name}
                        </div>
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
        </div>
      </section>

      <section>
        <div className="flex items-start gap-3 rounded-[var(--app-r-3)] border border-[var(--app-border)] bg-[var(--app-bg-2)] p-5">
          <Activity
            className="mt-0.5 h-4 w-4 shrink-0 text-[var(--app-fg-muted)]"
            strokeWidth={1.75}
          />
          <div className="flex-1">
            <p className="text-[13px] font-medium text-[var(--app-fg)]">How these numbers work</p>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-[var(--app-fg-muted)]">
              <span className="text-[var(--app-fg)]">Hours played</span> is a union — if two devices
              logged the same game at once, it's counted once.{' '}
              <span className="text-[var(--app-fg)]">Momentum</span> weights recent sessions more
              heavily using a <span className="app-num">{summary.half_life_days}</span>-day
              half-life, so a game you played today outranks one you played a month ago.{' '}
              <span className="text-[var(--app-fg)]">Raw sum</span> was{' '}
              <span className="app-num">{formatHours(summary.raw_sum_hours)}</span>h before
              deduping.
            </p>
          </div>
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--app-fg-dim)]" strokeWidth={1.75} />
        </div>
      </section>
    </div>
  )
}

function DashboardSkeleton({ name }) {
  return (
    <div className="mx-auto max-w-[1280px] space-y-8 px-8 py-8">
      <header>
        <div className="app-eyebrow text-[var(--app-fg-muted)]">Dashboard</div>
        <h1
          className="mt-2 font-normal tracking-tight text-[var(--app-fg-strong)]"
          style={{ fontSize: 'clamp(24px, 2.4vw, 32px)', lineHeight: 1.1 }}
        >
          Welcome back, {name}.
        </h1>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-[var(--app-r-3)] border border-[var(--app-border)] bg-[var(--app-bg-2)] p-5"
          >
            <Skeleton className="h-3 w-16" />
            <Skeleton className="mt-3 h-8 w-24" />
            <Skeleton className="mt-4 h-2.5 w-full" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 rounded-[var(--app-r-3)] border border-[var(--app-border)] bg-[var(--app-bg-2)] p-5 lg:col-span-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
        <div className="space-y-6">
          <Skeleton className="h-32" />
          <Skeleton className="h-56" />
        </div>
      </div>
    </div>
  )
}
