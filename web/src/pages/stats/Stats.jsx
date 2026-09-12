import { useMemo, useState } from 'react'
import { BarChart3, Clock, RefreshCw, Sigma, Timer, TrendingUp } from 'lucide-react'
import { Card } from '@/app/ui/Card'
import { EmptyState } from '@/app/ui/EmptyState'
import { ErrorState } from '@/app/ui/ErrorState'
import { IconButton } from '@/app/ui/IconButton'
import { SegmentedControl } from '@/app/ui/SegmentedControl'
import { Skeleton } from '@/app/ui/Skeleton'
import { BarChart, DistributionBar, Heatmap, KPITile, MomentumBar } from '@/app/viz'
import { coverBackgroundStyle } from '@/app/ui/safeUrl'
import { getLabelColor } from '@/app/design/tokens'
import { formatDate, formatHours, formatMinutes } from '@/lib/format'
import { labelTitle } from '@/pages/sessions/labels'
import { rangeToWindow, useStats } from './useStats'
import {
  dailyBuckets,
  filterByRange,
  hourOfDayMatrix,
  labelBreakdown,
  quickStats,
  sessionLengthBuckets,
  WEEKDAY_LONG,
} from './aggregations'

const RANGES = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: 'all', label: 'All time' },
]

const RANGE_DAY_COUNT = { '7d': 7, '30d': 30, '90d': 90 }

// For "all-time" the daily-buckets chart is meaningless past its window.
// Cap the visible daily chart at 30 days on "all" so recent shape stays
// legible; the KPI strip above already reports the full-history totals.
const ALL_TIME_BUCKET_DAYS = 30

export default function Stats() {
  const [range, setRange] = useState('all')
  const { summary, sessions, loading, error, reload } = useStats(range)

  const window = useMemo(() => rangeToWindow(range), [range])
  const rangedSessions = useMemo(() => filterByRange(sessions, window), [sessions, window])

  if (loading) return <StatsSkeleton />
  if (error) {
    return (
      <div className="mx-auto max-w-[1280px] px-8 py-8">
        <ErrorState title="We couldn't load your stats" description={error} onRetry={reload} />
      </div>
    )
  }

  const total = summary?.total_sessions ?? 0
  if (total === 0) return <StatsEmpty />

  return (
    <StatsPopulated
      range={range}
      setRange={setRange}
      reload={reload}
      summary={summary}
      sessions={rangedSessions}
    />
  )
}

function StatsEmpty() {
  return (
    <div className="mx-auto max-w-[1280px] px-8 py-8">
      <header className="mb-8">
        <div className="app-eyebrow text-[var(--app-fg-muted)]">Stats</div>
        <h1
          className="mt-2 font-normal tracking-tight text-[var(--app-fg-strong)]"
          style={{ fontSize: 'clamp(24px, 2.4vw, 32px)', lineHeight: 1.1 }}
        >
          Nothing to analyze yet.
        </h1>
      </header>
      <EmptyState
        icon={<BarChart3 className="h-8 w-8" strokeWidth={1.5} />}
        title="Play a few sessions"
        description="Stats become useful after you've logged real time. Heatmaps, label breakdowns, and length distributions all fill in from your actual sessions."
      />
    </div>
  )
}

function StatsPopulated({ range, setRange, reload, summary, sessions }) {
  const quick = useMemo(() => quickStats(sessions), [sessions])
  const bucketDays = RANGE_DAY_COUNT[range] ?? ALL_TIME_BUCKET_DAYS
  const daily = useMemo(() => dailyBuckets(sessions, bucketDays), [sessions, bucketDays])
  const heatmap = useMemo(() => hourOfDayMatrix(sessions), [sessions])
  const labels = useMemo(() => labelBreakdown(sessions), [sessions])
  const lengths = useMemo(() => sessionLengthBuckets(sessions), [sessions])

  const { labelSegments, labelTotal } = useMemo(() => {
    const segments = labels.map((l) => ({
      key: l.label,
      value: l.hours,
      color: getLabelColor(l.label),
      label: labelTitle(l.label),
    }))
    const total = labels.reduce((sum, l) => sum + l.hours, 0)
    return { labelSegments: segments, labelTotal: total }
  }, [labels])

  // Games list already comes ranged from /dashboard, so no client-side rework.
  const topGames = (summary.games || []).slice(0, 8)
  const maxDecay = Math.max(0.0001, ...topGames.map((g) => g.decay_hours))
  const maxLength = Math.max(1, ...lengths.map((l) => l.value))

  const rangeLabel = RANGES.find((r) => r.value === range)?.label ?? 'All time'

  return (
    <div className="mx-auto max-w-[1280px] space-y-8 px-8 py-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="app-eyebrow text-[var(--app-fg-muted)]">Stats</div>
          <h1
            className="mt-2 font-normal tracking-tight text-[var(--app-fg-strong)]"
            style={{ fontSize: 'clamp(24px, 2.4vw, 32px)', lineHeight: 1.1 }}
          >
            How you've been playing
          </h1>
          <p className="mt-2 max-w-[560px] text-[14px] text-[var(--app-fg-muted)]">
            Headline hours are union-corrected (overlap stripped). Shape charts below are additive
            over your session list — same {sessions.length.toLocaleString()} session
            {sessions.length === 1 ? '' : 's'} in the {rangeLabel.toLowerCase()} window.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SegmentedControl items={RANGES} value={range} onChange={setRange} size="sm" />
          <IconButton size="sm" label="Reload stats" onClick={reload}>
            <RefreshCw />
          </IconButton>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KPITile
          label="Hours played"
          value={formatHours(summary.total_hours)}
          unit="h"
          footnote={`Wall-clock union across ${summary.total_sessions.toLocaleString()} session${summary.total_sessions === 1 ? '' : 's'}.`}
        />
        <KPITile
          label="Momentum"
          value={formatHours(summary.decay_hours)}
          unit="h"
          footnote={`${summary.half_life_days}-day half-life. Older sessions fade.`}
        />
        <KPITile
          label="Avg session"
          value={formatMinutes(quick.avgMinutes)}
          footnote={`Median ${formatMinutes(quick.medianMinutes)} — half of your sessions fall on each side.`}
        />
        <KPITile
          label="Active days"
          value={quick.activeDays.toString()}
          footnote={
            range === 'all'
              ? 'Distinct calendar days with at least one session.'
              : `Of ${bucketDays} days in this window.`
          }
        />
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card padding="none" className="overflow-hidden lg:col-span-2">
          <div className="flex items-center justify-between border-b border-[var(--app-border)] p-5">
            <div>
              <div className="app-eyebrow text-[var(--app-fg-muted)]">Daily activity</div>
              <p className="mt-1 text-[13px] text-[var(--app-fg-muted)]">
                Hours per day, {rangeLabel.toLowerCase()}.
              </p>
            </div>
            <div className="text-right">
              <div
                className="app-num leading-none text-[var(--app-fg-strong)]"
                style={{ fontSize: 'clamp(20px, 1.6vw, 24px)' }}
              >
                {formatHours(daily.reduce((s, b) => s + b.value, 0))}
                <span className="text-[12px] text-[var(--app-fg-muted)]"> h</span>
              </div>
              <div className="app-num mt-0.5 text-[11px] text-[var(--app-fg-dim)]">total</div>
            </div>
          </div>
          <div className="p-5">
            <BarChart data={daily} height={140} ariaLabel="Hours per day" />
          </div>
        </Card>

        <Card>
          <div className="flex items-start justify-between">
            <div>
              <div className="app-eyebrow text-[var(--app-fg-muted)]">Longest session</div>
              {quick.longest ? (
                <>
                  <div
                    className="app-num mt-2 leading-none text-[var(--app-fg-strong)]"
                    style={{ fontSize: 'clamp(22px, 1.8vw, 26px)' }}
                  >
                    {formatMinutes(quick.longest.duration_sec / 60)}
                  </div>
                  <div className="mt-3 truncate text-[13.5px] text-[var(--app-fg)]">
                    {quick.longest.game_name}
                  </div>
                  <div className="app-num mt-0.5 text-[11.5px] text-[var(--app-fg-dim)]">
                    {formatDate(quick.longest.started_at)}
                  </div>
                </>
              ) : (
                <p className="mt-2 text-[13px] text-[var(--app-fg-muted)]">No sessions in range.</p>
              )}
            </div>
            <Timer className="h-4 w-4 text-[var(--app-fg-dim)]" strokeWidth={1.75} />
          </div>
        </Card>
      </section>

      <section>
        <Card padding="none">
          <div className="flex items-center justify-between border-b border-[var(--app-border)] p-5">
            <div>
              <div className="app-eyebrow text-[var(--app-fg-muted)]">When you play</div>
              <p className="mt-1 text-[13px] text-[var(--app-fg-muted)]">
                Weekday × hour of day. Cells are attributed to the session's start hour.
              </p>
            </div>
            <Clock className="h-4 w-4 text-[var(--app-fg-dim)]" strokeWidth={1.75} />
          </div>
          <div className="p-5">
            <Heatmap
              matrix={heatmap}
              rowLabels={WEEKDAY_LONG}
              ariaLabel="Hours played by weekday and hour"
            />
          </div>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <div className="app-eyebrow text-[var(--app-fg-muted)]">Label breakdown</div>
              <p className="mt-1 text-[13px] text-[var(--app-fg-muted)]">
                Share of {rangeLabel.toLowerCase()} hours by session label.
              </p>
            </div>
            <Sigma className="h-4 w-4 text-[var(--app-fg-dim)]" strokeWidth={1.75} />
          </div>
          <div className="mt-4">
            <DistributionBar
              segments={labelSegments}
              height={12}
              ariaLabel="Hours by session label"
            />
          </div>
          <ul className="mt-4 space-y-2">
            {labels.length === 0 && (
              <li className="text-[13px] text-[var(--app-fg-muted)]">Nothing labelled in range.</li>
            )}
            {labels.map((l) => {
              const pct = labelTotal > 0 ? (l.hours / labelTotal) * 100 : 0
              return (
                <li key={l.label} className="flex items-center gap-3">
                  <span
                    aria-hidden
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: getLabelColor(l.label) }}
                  />
                  <span className="flex-1 text-[13px] text-[var(--app-fg)]">
                    {labelTitle(l.label)}
                  </span>
                  <span className="app-num text-[12px] text-[var(--app-fg-muted)]">
                    {l.count} · {formatHours(l.hours)}h
                  </span>
                  <span className="app-num w-10 text-right text-[12px] text-[var(--app-fg-dim)]">
                    {pct.toFixed(0)}%
                  </span>
                </li>
              )
            })}
          </ul>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <div className="app-eyebrow text-[var(--app-fg-muted)]">Session length</div>
              <p className="mt-1 text-[13px] text-[var(--app-fg-muted)]">
                How long a single sitting tends to be.
              </p>
            </div>
            <TrendingUp className="h-4 w-4 text-[var(--app-fg-dim)]" strokeWidth={1.75} />
          </div>
          <ul className="mt-5 space-y-2.5">
            {lengths.map((b) => {
              const pct = maxLength > 0 ? (b.value / maxLength) * 100 : 0
              return (
                <li key={b.label} className="flex items-center gap-3">
                  <span className="w-14 shrink-0 text-[12.5px] text-[var(--app-fg-muted)]">
                    {b.label}
                  </span>
                  <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-[var(--app-bg-3)]">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-[var(--app-accent)]"
                      style={{ width: `${pct}%`, opacity: b.value > 0 ? 0.85 : 0.15 }}
                    />
                  </div>
                  <span className="app-num w-10 text-right text-[12px] text-[var(--app-fg-dim)]">
                    {b.value}
                  </span>
                </li>
              )
            })}
          </ul>
        </Card>
      </section>

      <section>
        <Card padding="none" className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--app-border)] p-5">
            <div>
              <div className="app-eyebrow text-[var(--app-fg-muted)]">Top games by momentum</div>
              <p className="mt-1 text-[13px] text-[var(--app-fg-muted)]">
                Weighted by recency — a game you played today outranks one you played weeks ago.
              </p>
            </div>
          </div>
          {topGames.length === 0 ? (
            <div className="p-6 text-[13.5px] text-[var(--app-fg-muted)]">
              No games ranked in this range.
            </div>
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
      </section>

      <section>
        <div className="flex items-start gap-3 rounded-[var(--app-r-3)] border border-[var(--app-border)] bg-[var(--app-bg-2)] p-5">
          <BarChart3
            className="mt-0.5 h-4 w-4 shrink-0 text-[var(--app-fg-muted)]"
            strokeWidth={1.75}
          />
          <div className="flex-1">
            <p className="text-[13px] font-medium text-[var(--app-fg)]">Reading these charts</p>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-[var(--app-fg-muted)]">
              <span className="text-[var(--app-fg)]">Headline hours</span> come from the server —
              same union math the dashboard uses, so two devices playing the same game at once are
              counted once. The <span className="text-[var(--app-fg)]">heatmap</span>,{' '}
              <span className="text-[var(--app-fg)]">label breakdown</span>, and{' '}
              <span className="text-[var(--app-fg)]">length distribution</span> are additive over
              your raw session list — they describe shape (when, what, how long), not corrected
              total hours. Client-side aggregation covers the most recent 500 sessions.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}

function StatsSkeleton() {
  return (
    <div className="mx-auto max-w-[1280px] space-y-8 px-8 py-8">
      <div className="space-y-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-4 w-3/4 max-w-[560px]" />
      </div>
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Skeleton className="h-64 lg:col-span-2" />
        <Skeleton className="h-64" />
      </div>
      <Skeleton className="h-56" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    </div>
  )
}
