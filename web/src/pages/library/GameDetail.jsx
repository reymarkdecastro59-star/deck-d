import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Gamepad2 } from 'lucide-react'
import { Button } from '@/app/ui/Button'
import { ErrorState } from '@/app/ui/ErrorState'
import { EmptyState } from '@/app/ui/EmptyState'
import { SectionHead } from '@/app/ui/SectionHead'
import { Skeleton } from '@/app/ui/Skeleton'
import { StatsStrip } from '@/app/ui/StatsStrip'
import { coverBackgroundStyle } from '@/app/ui/safeUrl'
import { BarChart } from '@/app/viz'
import { getLabelColor } from '@/app/design/tokens'
import { formatDate, formatDuration, formatHours } from '@/lib/format'
import { dailyBuckets } from '@/pages/stats/aggregations'
import { CoverFallback } from './CoverFallback'
import { useGameDetail } from './useGameDetail'

/**
 * Game Detail — an editorial media-detail page, not a mini-dashboard.
 * The cover artwork carries visual identity on the left; the title,
 * quick stats strip, and session history live on the right / below.
 * No card wrappers, no giant hero photo washing out the page.
 */
export default function GameDetail() {
  const { key } = useParams()
  const { game, halfLifeDays, sessions, loading, error, notFound, reload } = useGameDetail(key)

  const { buckets, weekTotal } = useMemo(() => {
    const b = dailyBuckets(sessions, 7)
    return { buckets: b, weekTotal: b.reduce((s, x) => s + x.value, 0) }
  }, [sessions])

  if (loading) return <GameDetailSkeleton />

  if (notFound) {
    return (
      <Container>
        <BackLink />
        <div className="mt-6">
          <EmptyState
            icon={<Gamepad2 className="h-8 w-8" strokeWidth={1.5} />}
            title="We couldn't find that game"
            description="It may have been removed, or the link is stale. Head back to your library."
            action={
              <Button as={Link} to="/library" variant="secondary">
                Back to library
              </Button>
            }
          />
        </div>
      </Container>
    )
  }

  if (error) {
    return (
      <Container>
        <BackLink />
        <div className="mt-6">
          <ErrorState title="We couldn't load this game" description={error} onRetry={reload} />
        </div>
      </Container>
    )
  }

  const cover = coverBackgroundStyle(game.background_image)
  const name = game.game || 'Untitled'
  const rawSumHours = (game.raw_sum_sec ?? 0) / 3600
  const overlapStrippedHours = (game.overlap_stripped_sec ?? 0) / 3600

  const strip = [
    { label: 'Hours', value: formatHours(game.total_hours), unit: 'h' },
    { label: 'Momentum', value: formatHours(game.decay_hours), unit: 'h' },
    { label: 'Sessions', value: sessions.length.toLocaleString() },
    { label: 'Raw sum', value: formatHours(rawSumHours), unit: 'h' },
  ]

  return (
    <Container>
      <BackLink />

      <div className="mt-6 grid grid-cols-1 gap-8 md:grid-cols-[minmax(160px,200px)_1fr] md:gap-10">
        <div
          aria-hidden
          className="relative aspect-[3/4] overflow-hidden rounded-[var(--app-r-2)] bg-[var(--app-bg-3)]"
          style={cover}
        >
          {!cover && <CoverFallback name={name} />}
        </div>
        <div className="min-w-0 self-end">
          <div className="app-eyebrow text-[10px] text-[var(--app-fg-dim)]">Game</div>
          <h1
            className="mt-2 font-normal leading-[1.05] tracking-tight text-[var(--app-fg-strong)]"
            style={{ fontSize: 'clamp(28px, 3vw, 40px)' }}
          >
            {name}
          </h1>
          <p className="app-num mt-3 text-[13px] text-[var(--app-fg-muted)]">
            {sessions.length.toLocaleString()} session{sessions.length === 1 ? '' : 's'} tracked
            {game.rawg_id != null && <span> · rawg #{game.rawg_id}</span>}
            {halfLifeDays && <span> · {halfLifeDays}-day half-life</span>}
          </p>
          <p className="mt-4 max-w-[560px] text-[12.5px] leading-relaxed text-[var(--app-fg-dim)]">
            Wall-clock union across all recorded sessions — overlap stripped, nothing
            double-counted.
            {overlapStrippedHours > 0 &&
              ` ${formatHours(overlapStrippedHours)}h stripped by overlap dedupe.`}
          </p>
        </div>
      </div>

      <StatsStrip items={strip} className="mt-10" />

      <div className="mt-12 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_320px] lg:gap-14">
        <section>
          <SectionHead
            eyebrow="Sessions"
            title={sessions.length === 0 ? 'No sessions yet' : 'Newest first'}
            viewAllTo="/sessions"
          />
          {sessions.length === 0 ? (
            <p className="mt-4 text-[13.5px] text-[var(--app-fg-muted)]">
              No sessions found for this game. This can happen if the tracker's first record is
              still syncing.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-[var(--app-hairline)]">
              {sessions.slice(0, 12).map((s) => {
                const dot = getLabelColor(s.label)
                return (
                  <li key={s.session_id} className="flex items-center gap-3.5 py-3">
                    <span
                      aria-hidden
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ background: dot }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-[13.5px] text-[var(--app-fg)]">
                        {formatDate(s.started_at, 'time')}
                      </div>
                      {s.label && (
                        <div className="mt-0.5 text-[11px] capitalize text-[var(--app-fg-dim)]">
                          {s.label}
                        </div>
                      )}
                    </div>
                    <div className="app-num shrink-0 text-[13px] text-[var(--app-fg-strong)]">
                      {formatDuration(s.duration_sec)}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <aside>
          <SectionHead eyebrow="This week" title={`${formatHours(weekTotal)} h`} />
          <div className="mt-4">
            <BarChart data={buckets} ariaLabel="Hours played per day, last 7 days" />
          </div>
          <p className="mt-6 text-[11.5px] leading-relaxed text-[var(--app-fg-dim)]">
            Sessions are matched by title. Two launchers using the same name (Steam and Epic) count
            as one game; different names may show up as siblings until RAWG metadata resolves.
          </p>
        </aside>
      </div>
    </Container>
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

function BackLink() {
  return (
    <Link
      to="/library"
      className="inline-flex items-center gap-1.5 text-[12.5px] text-[var(--app-fg-muted)] transition-colors [transition-duration:var(--app-dur-1)] hover:text-[var(--app-fg)]"
    >
      <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.75} />
      Library
    </Link>
  )
}

function GameDetailSkeleton() {
  return (
    <Container>
      <Skeleton className="h-4 w-24" />
      <div className="mt-6 grid grid-cols-1 gap-8 md:grid-cols-[minmax(160px,200px)_1fr] md:gap-10">
        <Skeleton className="aspect-[3/4]" />
        <div className="space-y-3 self-end">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-9 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-2.5 w-full max-w-[420px]" />
        </div>
      </div>
      <div className="mt-10 grid grid-cols-2 gap-y-6 md:flex md:gap-0">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="min-w-0 md:flex-1 md:px-6">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="mt-3 h-2.5 w-16" />
          </div>
        ))}
      </div>
      <div className="mt-12 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_320px] lg:gap-14">
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10" />
          ))}
        </div>
        <div>
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-4 h-24" />
        </div>
      </div>
    </Container>
  )
}
