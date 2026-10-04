import { useMemo, useState } from 'react'
import { BarChart3, RefreshCw } from 'lucide-react'
import { EmptyState } from '@/app/ui/EmptyState'
import { ErrorState } from '@/app/ui/ErrorState'
import { IconButton } from '@/app/ui/IconButton'
import { SectionHead } from '@/app/ui/SectionHead'
import { SegmentedControl } from '@/app/ui/SegmentedControl'
import { Skeleton } from '@/app/ui/Skeleton'
import { StatsStrip } from '@/app/ui/StatsStrip'
import { BarChart, DistributionBar, Heatmap, MomentumBar } from '@/app/viz'
import { coverBackgroundStyle } from '@/app/ui/safeUrl'
import { getLabelColor } from '@/app/design/tokens'
import { formatHours, formatMinutes } from '@/lib/format'
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
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: '90d', label: '90d' },
  { value: 'all', label: 'All' },
]

const RANGE_DAY_COUNT = { '7d': 7, '30d': 30, '90d': 90 }
const ALL_TIME_BUCKET_DAYS = 30

/**
 * Stats — a quiet personal report. Kills the 4-KPI-tile row in favor of
 * a typographic StatsStrip, drops the card wrappers around every chart,
 * and lets sections breathe with hairline separators instead of borders.
 */
export default function Stats() {
  const [range, setRange] = useState('all')
  const { summary, sessions, loading, error, reload } = useStats(range)

  const window = useMemo(() => rangeToWindow(range), [range])
  const rangedSessions = useMemo(() => filterByRange(sessions, window), [sessions, window])

  if (loading) return <StatsSkeleton />
  if (error) {
    return (
      <Container>
        <Header range={range} onRangeChange={setRange} onReload={reload} loading={false} />
        <div className="mt-6">
          <ErrorState title="We couldn't load your stats" description={error} onRetry={reload} />
        </div>
      </Container>
    )
  }

  const total = summary?.total_sessions ?? 0
  if (total === 0) {
    return (
      <Container>
        <Header range={range} onRangeChange={setRange} onReload={reload} showControls={false} />
        <div className="mt-8">
          <EmptyState
            icon={<BarChart3 className="h-8 w-8" strokeWidth={1.5} />}
            title="Nothing to analyze yet"
            description="Stats become useful after you've logged real time — heatmaps, breakdowns, and length distributions all fill in from your actual sessions."
          />
        </div>
      </Container>
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

function Container({ children }) {
  return (
    <div
      className="mx-auto w-full px-6 py-8 lg:px-10"
      style={{ maxWidth: 'var(--app-content-max)' }}
    >
      {children}
    </div>
  )
}

function Header({ range, onRangeChange, onReload, showControls = true }) {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
      <h1
        className="font-normal tracking-tight text-[var(--app-fg-strong)]"
        style={{ fontSize: 'clamp(20px, 1.8vw, 26px)' }}
      >
        Stats
      </h1>
      {showControls && (
        <div className="flex flex-1 flex-wrap items-center justify-end gap-3">
          <SegmentedControl items={RANGES} value={range} onChange={onRangeChange} size="sm" />
          <IconButton size="sm" label="Reload stats" onClick={onReload}>
            <RefreshCw />
          </IconButton>
        </div>
      )}
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

  const topGames = (summary.games || []).slice(0, 8)
  const maxDecay = Math.max(0.0001, ...topGames.map((g) => g.decay_hours))
  const maxLength = Math.max(1, ...lengths.map((l) => l.value))

  const rangeLabel = RANGES.find((r) => r.value === range)?.label ?? 'All'
  const rangeLower = rangeLabel === 'All' ? 'all time' : `last ${rangeLabel}`

  const strip = [
    { label: 'Hours', value: formatHours(summary.total_hours), unit: 'h' },
    { label: 'Momentum', value: formatHours(summary.decay_hours), unit: 'h' },
    { label: 'Avg session', value: formatMinutes(quick.avgMinutes) },
    { label: 'Active days', value: quick.activeDays.toString() },
  ]

  return (
    <Container>
      <Header range={range} onRangeChange={setRange} onReload={reload} />

      <p className="mt-3 max-w-[640px] text-[13px] leading-relaxed text-[var(--app-fg-muted)]">
        Headline hours are union-corrected. Shape charts below are additive over your session list —
        same {sessions.length.toLocaleString()} session{sessions.length === 1 ? '' : 's'} in the{' '}
        {rangeLower} window.
      </p>

      <StatsStrip items={strip} className="mt-8" />

      <Section>
        <SectionHead
          eyebrow="Daily activity"
          title={`Hours per day — ${rangeLower}`}
          aside={
            <div className="text-right">
              <div
                className="app-num leading-none text-[var(--app-fg-strong)]"
                style={{ fontSize: 'clamp(18px, 1.4vw, 22px)' }}
              >
                {formatHours(daily.reduce((s, b) => s + b.value, 0))}
                <span className="text-[12px] text-[var(--app-fg-muted)]"> h</span>
              </div>
              <div className="app-num mt-0.5 text-[10.5px] text-[var(--app-fg-dim)]">total</div>
            </div>
          }
        />
        <div className="mt-4">
          <BarChart data={daily} height={140} ariaLabel="Hours per day" />
        </div>
      </Section>

      <Section>
        <SectionHead
          eyebrow="When you play"
          title="Weekday × hour"
          aside={
            quick.longest && (
              <div className="text-right">
                <div className="app-eyebrow text-[10px] text-[var(--app-fg-dim)]">Longest</div>
                <div className="app-num mt-0.5 text-[13px] text-[var(--app-fg)]">
                  {formatMinutes(quick.longest.duration_sec / 60)}
                </div>
              </div>
            )
          }
        />
        <div className="mt-4">
          <Heatmap
            matrix={heatmap}
            rowLabels={WEEKDAY_LONG}
            ariaLabel="Hours played by weekday and hour"
          />
        </div>
      </Section>

      <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-2">
        <section>
          <SectionHead eyebrow="Label breakdown" title={`Share by label — ${rangeLower}`} />
          <div className="mt-4">
            <DistributionBar
              segments={labelSegments}
              height={10}
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
        </section>

        <section>
          <SectionHead eyebrow="Session length" title="Distribution" />
          <ul className="mt-4 space-y-2.5">
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
        </section>
      </div>

      <Section>
        <SectionHead eyebrow="Top games" title="By momentum" viewAllTo="/library" />
        {topGames.length === 0 ? (
          <p className="mt-4 text-[13.5px] text-[var(--app-fg-muted)]">
            No games ranked in this range.
          </p>
        ) : (
          <ol className="mt-4 divide-y divide-[var(--app-hairline)]">
            {topGames.map((g, i) => (
              <li key={g.rawg_id ?? g.slug ?? g.game ?? i} className="flex items-center gap-4 py-3">
                <span className="app-num w-5 shrink-0 text-right text-[12px] text-[var(--app-fg-dim)]">
                  {i + 1}
                </span>
                <div
                  aria-hidden
                  className="h-11 w-8 shrink-0 overflow-hidden rounded-[3px] bg-[var(--app-bg-3)]"
                  style={coverBackgroundStyle(g.background_image)}
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] text-[var(--app-fg)]">{g.game}</div>
                  <MomentumBar value={g.decay_hours} max={maxDecay} className="mt-2" />
                </div>
                <div className="shrink-0 text-right">
                  <div className="app-num text-[13px] text-[var(--app-fg-strong)]">
                    {formatHours(g.total_hours)}
                    <span className="text-[11px] text-[var(--app-fg-muted)]"> h</span>
                  </div>
                  <div className="app-num mt-0.5 text-[11px] text-[var(--app-fg-dim)]">
                    {formatHours(g.decay_hours)}h momentum
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </Section>

      <div className="mt-10 border-t border-[var(--app-hairline)] pt-6">
        <p className="max-w-[720px] text-[12px] leading-relaxed text-[var(--app-fg-dim)]">
          <span className="app-eyebrow mr-2 text-[10px] text-[var(--app-fg-muted)]">
            Reading this
          </span>
          Headline hours come from the server — same union math the dashboard uses, so two devices
          playing the same game at once are counted once. Shape charts (heatmap, label breakdown,
          length distribution) are additive over the raw session list — they describe when, what,
          how long, not corrected total hours. Client-side aggregation covers the most recent 500
          sessions.
        </p>
      </div>
    </Container>
  )
}

function Section({ children }) {
  return <section className="mt-10">{children}</section>
}

function StatsSkeleton() {
  return (
    <Container>
      <div className="flex items-center gap-6">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="ml-auto h-8 w-56" />
      </div>
      <Skeleton className="mt-4 h-3 w-3/4 max-w-[560px]" />
      <div className="mt-8 grid grid-cols-2 gap-y-6 md:flex md:gap-0">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="min-w-0 md:flex-1 md:px-6">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="mt-3 h-2.5 w-16" />
          </div>
        ))}
      </div>
      <Skeleton className="mt-10 h-40" />
      <Skeleton className="mt-10 h-44" />
      <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-2">
        <Skeleton className="h-52" />
        <Skeleton className="h-52" />
      </div>
    </Container>
  )
}
