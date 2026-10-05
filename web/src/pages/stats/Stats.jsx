import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BarChart3, RefreshCw } from 'lucide-react'
import { Art } from '@/app/ui/Art'
import { EmptyState } from '@/app/ui/EmptyState'
import { ErrorState } from '@/app/ui/ErrorState'
import { IconButton } from '@/app/ui/IconButton'
import { PageFrame, PageHeader } from '@/app/ui/PageHeader'
import { Panel, PanelHead } from '@/app/ui/Panel'
import { SegmentedControl } from '@/app/ui/SegmentedControl'
import { Skeleton } from '@/app/ui/Skeleton'
import { StatsStrip } from '@/app/ui/StatsStrip'
import { BarChart, DistributionBar, Heatmap, MomentumBar } from '@/app/viz'
import { getLabelColor } from '@/app/design/tokens'
import { formatHours, formatMinutes } from '@/lib/format'
import { labelTitle } from '@/pages/sessions/labels'
import { gameKey } from '@/pages/library/gameKey'
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
const ALL_TIME_BUCKET_DAYS = 30
// Monday-first, like the Week Meter everywhere else (matrix rows are Sun=0).
const MON_FIRST = [1, 2, 3, 4, 5, 6, 0]

/**
 * Stats (UX v2 §5.6) — a personal report in question panels:
 *   readouts for the chosen range
 *   How much you played (daily bars)
 *   When you play (heatmap) · How long you play (length bars)
 *   What kind of play (labels) · Top games by momentum
 * Every number follows the range control.
 */
export default function Stats() {
  const [range, setRange] = useState('all')
  const { summary, sessions, loading, error, reload } = useStats(range)

  const window = useMemo(() => rangeToWindow(range), [range])
  const rangedSessions = useMemo(() => filterByRange(sessions, window), [sessions, window])

  if (loading) return <StatsSkeleton />
  if (error) {
    return (
      <PageFrame>
        <Header range={range} onRangeChange={setRange} onReload={reload} />
        <ErrorState title="We couldn't load your stats" description={error} onRetry={reload} />
      </PageFrame>
    )
  }

  if ((summary?.total_sessions ?? 0) === 0) {
    return (
      <PageFrame>
        <Header range={range} onRangeChange={setRange} onReload={reload} showControls={false} />
        <EmptyState
          icon={<BarChart3 className="h-8 w-8" strokeWidth={1.5} />}
          title="Nothing to show yet"
          description="Play a few sessions with the tracker running and your patterns will appear here."
        />
      </PageFrame>
    )
  }

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

function Header({ range, onRangeChange, onReload, showControls = true }) {
  return (
    <PageHeader
      title="Stats"
      lede="How much, when and what you play."
      actions={
        showControls && (
          <>
            <SegmentedControl
              items={RANGES}
              value={range}
              onChange={onRangeChange}
              ariaLabel="Time range"
            />
            <IconButton label="Reload stats" onClick={onReload}>
              <RefreshCw />
            </IconButton>
          </>
        )
      }
    />
  )
}

function StatsPopulated({ range, setRange, reload, summary, sessions }) {
  const quick = useMemo(() => quickStats(sessions), [sessions])
  const bucketDays = RANGE_DAY_COUNT[range] ?? ALL_TIME_BUCKET_DAYS
  const daily = useMemo(() => dailyBuckets(sessions, bucketDays), [sessions, bucketDays])
  const heatmap = useMemo(() => {
    const m = hourOfDayMatrix(sessions)
    return MON_FIRST.map((d) => m[d])
  }, [sessions])
  const labels = useMemo(() => labelBreakdown(sessions), [sessions])
  const lengths = useMemo(() => sessionLengthBuckets(sessions), [sessions])

  const { labelSegments, labelTotal } = useMemo(() => {
    const segments = labels.map((l) => ({
      key: l.label,
      value: l.hours,
      color: getLabelColor(l.label),
      label: labelTitle(l.label),
    }))
    return { labelSegments: segments, labelTotal: labels.reduce((sum, l) => sum + l.hours, 0) }
  }, [labels])

  const topGames = (summary.games || []).slice(0, 6)
  const maxDecay = Math.max(0.0001, ...topGames.map((g) => g.decay_hours ?? 0))
  const maxLength = Math.max(1, ...lengths.map((l) => l.value))

  const dailyLower = `the last ${bucketDays} days`
  const dailyTotal = daily.reduce((sum, b) => sum + b.value, 0)

  // All-time hours come from the server, where sessions overlapping on two
  // devices count once; a shorter range sums its sessions.
  const hours = range === 'all' ? summary.total_hours : quick.totalHours
  const strip = [
    { label: 'Hours played', value: formatHours(hours), unit: 'h' },
    { label: 'Sessions', value: quick.count.toLocaleString() },
    { label: 'Typical session', value: formatMinutes(quick.medianMinutes) },
    { label: 'Play days', value: quick.activeDays.toLocaleString() },
  ]

  return (
    <PageFrame>
      <Header range={range} onRangeChange={setRange} onReload={reload} />

      <StatsStrip items={strip} />

      <Panel aria-labelledby="st-daily" className="mt-6">
        <PanelHead
          id="st-daily"
          title="How much you played"
          description={`Hours per day, ${dailyLower}`}
          action={
            <span className="app-num text-[17px] text-[var(--app-fg-strong)]">
              {formatHours(dailyTotal)} h
            </span>
          }
        />
        <BarChart data={daily} height={150} ariaLabel={`Hours per day, ${dailyLower}`} />
      </Panel>

      <div className="mt-6 flex flex-wrap gap-6">
        <Panel aria-labelledby="st-when" className="flex-[7_1_560px]">
          <PanelHead
            id="st-when"
            title="When you play"
            description="Hours by day of the week and time of day"
          />
          <Heatmap
            matrix={heatmap}
            rowLabels={MON_FIRST.map((d) => WEEKDAY_LONG[d])}
            ariaLabel="Hours played by weekday and hour"
          />
        </Panel>

        <Panel aria-labelledby="st-length" className="flex-[5_1_340px]">
          <PanelHead
            id="st-length"
            title="How long you play"
            description={
              quick.longest
                ? `Longest: ${formatMinutes(quick.longest.duration_sec / 60)} of ${quick.longest.game_name}`
                : 'Sessions by length'
            }
          />
          <ul className="space-y-3">
            {lengths.map((b) => {
              const pct = (b.value / maxLength) * 100
              return (
                <li key={b.label} className="grid grid-cols-[64px_1fr_32px] items-center gap-3">
                  <span className="app-num app-wt-small text-[14px] text-[var(--app-fg-muted)]">
                    {b.label}
                  </span>
                  <span className="relative h-2.5 overflow-hidden rounded-[3px] bg-[var(--app-bg-3)]">
                    <span
                      className="absolute inset-y-0 left-0 rounded-[3px] bg-[var(--app-accent)]"
                      style={{ width: `${b.value > 0 ? Math.max(3, pct) : 0}%` }}
                    />
                  </span>
                  <span className="app-num text-right text-[14px] text-[var(--app-fg)]">
                    {b.value}
                  </span>
                </li>
              )
            })}
          </ul>
        </Panel>
      </div>

      <div className="mt-6 flex flex-wrap gap-6">
        <Panel aria-labelledby="st-kind" className="flex-[5_1_340px]">
          <PanelHead
            id="st-kind"
            title="What kind of play"
            description="Share of hours by session label"
          />
          {labels.length === 0 ? (
            <p className="app-wt-small text-[15px] text-[var(--app-fg-muted)]">
              No labelled sessions in this range.
            </p>
          ) : (
            <>
              <DistributionBar
                segments={labelSegments}
                height={12}
                ariaLabel="Hours by session label"
              />
              <ul className="mt-4 space-y-2.5">
                {labels.map((l) => {
                  const pct = labelTotal > 0 ? (l.hours / labelTotal) * 100 : 0
                  return (
                    <li key={l.label} className="flex items-center gap-3 text-[14px]">
                      <span
                        aria-hidden
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ background: getLabelColor(l.label) }}
                      />
                      <span className="flex-1 text-[var(--app-fg)]">{labelTitle(l.label)}</span>
                      <span className="app-num app-wt-small text-[var(--app-fg-muted)]">
                        {formatHours(l.hours)} h · {l.count}{' '}
                        {l.count === 1 ? 'session' : 'sessions'}
                      </span>
                      <span className="app-num w-12 text-right text-[var(--app-fg-strong)]">
                        {pct.toFixed(0)}%
                      </span>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </Panel>

        <Panel aria-labelledby="st-top" className="flex-[7_1_520px]">
          <PanelHead
            id="st-top"
            title="Top games by momentum"
            description="Recent play counts more; it halves every 14 days"
            action={
              <Link
                to="/library"
                className="app-wt-small inline-flex shrink-0 items-center gap-1.5 text-[14px] text-[var(--app-fg-muted)] transition-colors [transition-duration:var(--app-dur-1)] hover:text-[var(--app-fg)]"
              >
                Library
                <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
              </Link>
            }
          />
          {topGames.length === 0 ? (
            <p className="app-wt-small text-[15px] text-[var(--app-fg-muted)]">No games yet.</p>
          ) : (
            <ol className="-mx-2.5">
              {topGames.map((g, i) => (
                <li key={g.rawg_id ?? g.slug ?? g.game ?? i}>
                  <Link
                    to={`/library/${gameKey(g)}`}
                    className="grid grid-cols-[20px_36px_minmax(0,1fr)_auto] items-center gap-3.5 rounded-[var(--app-r-2)] px-2.5 py-2 transition-colors [transition-duration:var(--app-dur-1)] hover:bg-[var(--app-bg-3)]"
                  >
                    <span className="app-num text-right text-[14px] text-[var(--app-fg-dim)]">
                      {i + 1}
                    </span>
                    <Art game={g} className="h-12 w-9 rounded-[4px]" />
                    <span className="flex min-w-0 flex-col gap-2">
                      <span className="truncate text-[15px] font-semibold text-[var(--app-fg-strong)]">
                        {g.game}
                      </span>
                      <MomentumBar value={g.decay_hours ?? 0} max={maxDecay} />
                    </span>
                    <span className="flex flex-col items-end gap-0.5">
                      <span className="app-num text-[15px] text-[var(--app-fg-strong)]">
                        {formatHours(g.decay_hours)} h
                      </span>
                      <span className="app-num app-wt-small text-[13px] text-[var(--app-fg-muted)]">
                        {formatHours(g.total_hours)} h total
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>
    </PageFrame>
  )
}

function StatsSkeleton() {
  return (
    <PageFrame>
      <Skeleton className="h-9 w-32" />
      <Skeleton className="mt-3 h-4 w-72" />
      <Skeleton className="mt-8 h-[116px] rounded-[var(--app-r-3)]" />
      <Skeleton className="mt-6 h-[260px] rounded-[var(--app-r-3)]" />
      <div className="mt-6 flex flex-wrap gap-6">
        <Skeleton className="h-[300px] min-w-0 flex-[7_1_560px] rounded-[var(--app-r-3)]" />
        <Skeleton className="h-[300px] min-w-0 flex-[5_1_340px] rounded-[var(--app-r-3)]" />
      </div>
    </PageFrame>
  )
}
