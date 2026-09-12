import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Calendar, Gamepad2, Info } from 'lucide-react'
import { Button } from '@/app/ui/Button'
import { Card } from '@/app/ui/Card'
import { ErrorState } from '@/app/ui/ErrorState'
import { EmptyState } from '@/app/ui/EmptyState'
import { Skeleton } from '@/app/ui/Skeleton'
import { safeImageUrl } from '@/app/ui/safeUrl'
import { BarChart, KPITile } from '@/app/viz'
import { getLabelColor } from '@/app/design/tokens'
import { weeklyBuckets } from '@/pages/dashboard/weeklyBuckets'
import { useGameDetail } from './useGameDetail'

function formatHours(v) {
  if (v == null || Number.isNaN(v)) return '0'
  if (v < 1) return v.toFixed(2).replace(/\.?0+$/, '') || '0'
  if (v < 10) return v.toFixed(1)
  return Math.round(v).toString()
}

function formatDate(unix) {
  return new Date(unix * 1000).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export default function GameDetail() {
  const { key } = useParams()
  const { game, halfLifeDays, sessions, loading, error, notFound, reload } = useGameDetail(key)

  if (loading) return <GameDetailSkeleton />

  if (notFound) {
    return (
      <div className="mx-auto max-w-[1280px] px-8 py-8">
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
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-[1280px] px-8 py-8">
        <BackLink />
        <div className="mt-6">
          <ErrorState title="We couldn't load this game" description={error} onRetry={reload} />
        </div>
      </div>
    )
  }

  const buckets = weeklyBuckets(sessions)
  const weekTotal = buckets.reduce((s, b) => s + b.value, 0)
  const rawSumHours = (game.raw_sum_sec ?? 0) / 3600
  const overlapStrippedHours = (game.overlap_stripped_sec ?? 0) / 3600

  return (
    <div className="mx-auto max-w-[1280px] space-y-8 px-8 py-8">
      <BackLink />

      <section className="relative overflow-hidden rounded-[var(--app-r-3)] border border-[var(--app-border)] bg-[var(--app-bg-2)]">
        {safeImageUrl(game.background_image) && (
          <>
            <div
              aria-hidden
              className="absolute inset-0 bg-cover bg-center opacity-55"
              style={{ backgroundImage: `url(${safeImageUrl(game.background_image)})` }}
            />
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(90deg, var(--app-bg-2) 0%, var(--app-bg-2) 44%, rgba(10,11,24,0.6) 72%, rgba(10,11,24,0) 100%)',
              }}
            />
          </>
        )}
        <div className="relative flex min-h-[200px] items-end justify-between gap-8 p-8 lg:p-10">
          <div className="max-w-[62%]">
            <div className="app-eyebrow text-[var(--app-fg-muted)]">Game</div>
            <h1
              className="mt-2 font-normal tracking-tight text-[var(--app-fg-strong)]"
              style={{ fontSize: 'clamp(28px, 3.2vw, 44px)', lineHeight: 1.05 }}
            >
              {game.game}
            </h1>
            <p className="mt-3 text-[13.5px] text-[var(--app-fg-muted)]">
              {sessions.length.toLocaleString()} session{sessions.length === 1 ? '' : 's'} tracked
              {game.rawg_id != null && <span className="app-num"> · rawg #{game.rawg_id}</span>}
            </p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KPITile
          label="Hours played"
          value={formatHours(game.total_hours)}
          unit="h"
          footnote="Wall-clock union — overlap stripped."
        />
        <KPITile
          label="Momentum"
          value={formatHours(game.decay_hours)}
          unit="h"
          footnote={
            halfLifeDays ? `Decay-weighted, ${halfLifeDays}-day half-life.` : 'Decay-weighted.'
          }
        />
        <KPITile
          label="Sessions"
          value={sessions.length.toLocaleString()}
          footnote="Every recorded play for this title."
        />
        <KPITile
          label="Raw sum"
          value={formatHours(rawSumHours)}
          unit="h"
          footnote={
            overlapStrippedHours > 0
              ? `${formatHours(overlapStrippedHours)}h stripped by overlap dedupe.`
              : 'No overlap deduped — sessions never ran concurrently.'
          }
        />
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card padding="none" className="overflow-hidden lg:col-span-2">
          <div className="flex items-center justify-between border-b border-[var(--app-border)] p-5">
            <div>
              <div className="app-eyebrow text-[var(--app-fg-muted)]">Sessions</div>
              <p className="mt-1 text-[13px] text-[var(--app-fg-muted)]">
                Newest first. Manage all sessions in the Sessions view.
              </p>
            </div>
            <Link
              to="/sessions"
              className="text-[13px] text-[var(--app-fg-muted)] transition-colors hover:text-[var(--app-fg)]"
            >
              All sessions →
            </Link>
          </div>
          {sessions.length === 0 ? (
            <div className="p-8 text-[13.5px] text-[var(--app-fg-muted)]">
              No sessions found for this game. This can happen if the tracker's first record is
              still syncing.
            </div>
          ) : (
            <ul className="divide-y divide-[var(--app-hairline)]">
              {sessions.slice(0, 12).map((s) => {
                const dot = getLabelColor(s.label)
                return (
                  <li key={s.session_id} className="flex items-center gap-3 p-4">
                    <span
                      aria-hidden
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ background: dot }}
                    />
                    <Calendar
                      className="h-4 w-4 shrink-0 text-[var(--app-fg-dim)]"
                      strokeWidth={1.75}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-[13.5px] text-[var(--app-fg)]">
                        {formatDate(s.started_at)}
                      </div>
                      {s.label && (
                        <div className="mt-0.5 text-[11.5px] capitalize text-[var(--app-fg-muted)]">
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
        </Card>

        <div className="space-y-6">
          <Card>
            <div>
              <div className="app-eyebrow text-[var(--app-fg-muted)]">This week</div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span
                  className="app-num leading-none text-[var(--app-fg-strong)]"
                  style={{ fontSize: 'clamp(22px, 1.8vw, 26px)' }}
                >
                  {formatHours(weekTotal)}
                </span>
                <span className="text-[13px] text-[var(--app-fg-muted)]">h</span>
              </div>
            </div>
            <div className="mt-4">
              <BarChart data={buckets} ariaLabel="Hours played per day, last 7 days" />
            </div>
          </Card>

          <div className="flex items-start gap-3 rounded-[var(--app-r-3)] border border-[var(--app-border)] bg-[var(--app-bg-2)] p-4">
            <Info
              className="mt-0.5 h-4 w-4 shrink-0 text-[var(--app-fg-muted)]"
              strokeWidth={1.75}
            />
            <p className="text-[12.5px] leading-relaxed text-[var(--app-fg-muted)]">
              Sessions are matched by title. Two launchers using the same name (Steam and Epic)
              count as one game; different names may show up as siblings until RAWG metadata
              resolves.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}

function BackLink() {
  return (
    <Link
      to="/library"
      className="inline-flex items-center gap-1.5 text-[13px] text-[var(--app-fg-muted)] transition-colors hover:text-[var(--app-fg)]"
    >
      <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.75} />
      Back to library
    </Link>
  )
}

function GameDetailSkeleton() {
  return (
    <div className="mx-auto max-w-[1280px] space-y-8 px-8 py-8">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-[200px] w-full" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
        <div className="space-y-6">
          <Skeleton className="h-32" />
          <Skeleton className="h-20" />
        </div>
      </div>
    </div>
  )
}
