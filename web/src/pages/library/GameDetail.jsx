import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Gamepad2 } from 'lucide-react'
import { Art, ArtChip, ArtScrim } from '@/app/ui/Art'
import { StateShape } from '@/app/ui/brand'
import { Button } from '@/app/ui/Button'
import { ErrorState } from '@/app/ui/ErrorState'
import { EmptyState } from '@/app/ui/EmptyState'
import { PageFrame } from '@/app/ui/PageHeader'
import { Panel, PanelHead } from '@/app/ui/Panel'
import { Skeleton } from '@/app/ui/Skeleton'
import { StatsStrip } from '@/app/ui/StatsStrip'
import { BarChart } from '@/app/viz'
import { formatDate, formatDuration, formatHours, relativeTime } from '@/lib/format'
import { gameState, STATE_LABEL } from '@/lib/gameState'
import { dailyBuckets } from '@/pages/stats/aggregations'
import { labelTitle } from '@/pages/sessions/labels'
import { useGameDetail } from './useGameDetail'

const STATE_ON_ART = { active: '#55E6C1', drifting: '#F4B860', dormant: '#A9B2BB' }

/**
 * Game detail (UX v2 §5.4): a landscape art hero carries the game's
 * identity (title, state, last played), then one readout panel, then the
 * two things you come here for — the session history and recent activity.
 */
export default function GameDetail() {
  const { key } = useParams()
  const { game, halfLifeDays, sessions, loading, error, notFound, reload } = useGameDetail(key)

  const { buckets, weekTotal, lastPlayed, longest } = useMemo(() => {
    const b = dailyBuckets(sessions, 7)
    return {
      buckets: b,
      weekTotal: b.reduce((s, x) => s + x.value, 0),
      lastPlayed: sessions.reduce((m, s) => Math.max(m, s.ended_at ?? s.started_at ?? 0), 0),
      longest: sessions.reduce((m, s) => Math.max(m, s.duration_sec ?? 0), 0),
    }
  }, [sessions])

  if (loading) return <GameDetailSkeleton />

  if (notFound) {
    return (
      <PageFrame>
        <BackLink />
        <EmptyState
          icon={<Gamepad2 className="h-8 w-8" strokeWidth={1.5} />}
          title="We couldn't find that game"
          description="It may have been removed, or the link is out of date."
          action={
            <Button as={Link} to="/library" variant="secondary">
              Back to library
            </Button>
          }
        />
      </PageFrame>
    )
  }

  if (error) {
    return (
      <PageFrame>
        <BackLink />
        <ErrorState title="We couldn't load this game" description={error} onRetry={reload} />
      </PageFrame>
    )
  }

  const name = game.game || 'Untitled'
  const state = gameState(lastPlayed || null)
  const importedFrom = game.imported_from?.length ? game.imported_from.join(', ') : null
  // With a launcher import, show where the hours come from: the total is the
  // larger of tracked and imported (an hour both saw is counted once).
  const strip = importedFrom
    ? [
        {
          label: 'Total played',
          value: formatHours(game.total_hours),
          unit: 'h',
          hint: 'Counted once across both',
        },
        { label: "Tracked by DECK'D", value: formatHours(game.tracked_hours ?? 0), unit: 'h' },
        { label: `From ${importedFrom}`, value: formatHours(game.imported_hours), unit: 'h' },
        { label: 'Sessions', value: sessions.length.toLocaleString() },
      ]
    : [
        { label: 'Total played', value: formatHours(game.total_hours), unit: 'h' },
        {
          label: 'Momentum',
          value: formatHours(game.decay_hours),
          unit: 'h',
          hint: halfLifeDays ? `Halves every ${halfLifeDays} days` : null,
        },
        { label: 'Sessions', value: sessions.length.toLocaleString() },
        { label: 'Longest session', value: longest ? formatDuration(longest) : null },
      ]

  return (
    <PageFrame>
      <BackLink />

      <Art
        game={game}
        name={name}
        initial={false}
        position="50% 35%"
        className="app-frame flex min-h-[280px] items-end rounded-[var(--app-r-art)] sm:min-h-[340px]"
      >
        <ArtScrim direction="left" />
        <div className="relative flex flex-col gap-3 p-6 text-[#F5F7F8] sm:p-9">
          <div>
            <ArtChip>
              <StateShape state={state} color={STATE_ON_ART[state]} />
              {STATE_LABEL[state]}
              {lastPlayed ? ` · last played ${relativeTime(lastPlayed)}` : ''}
            </ArtChip>
          </div>
          <h1 className="text-[34px] font-semibold leading-none tracking-[-0.035em] sm:text-[52px]">
            {name}
          </h1>
          <p className="text-[16px] font-medium">
            {formatHours(game.total_hours)} h played · {sessions.length.toLocaleString()}{' '}
            {sessions.length === 1 ? 'session' : 'sessions'}
          </p>
        </div>
      </Art>

      <StatsStrip items={strip} className="mt-6" />

      <div className="mt-6 flex flex-wrap gap-6">
        <Panel aria-labelledby="gd-sessions" className="flex-[7_1_520px]">
          <PanelHead
            id="gd-sessions"
            title="Sessions"
            description={sessions.length ? 'Newest first' : undefined}
          />
          {sessions.length === 0 ? (
            <p className="app-wt-small text-[15px] text-[var(--app-fg-muted)]">
              {importedFrom
                ? `DECK'D hasn't recorded this game yet. The hours above come from ${importedFrom}.`
                : 'No sessions yet. If you just played, the tracker may still be syncing.'}
            </p>
          ) : (
            <ul>
              {sessions.slice(0, 12).map((s) => (
                <li
                  key={s.session_id}
                  className="flex items-center gap-4 border-t border-[var(--app-hairline)] py-3 first:border-t-0"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-[15px] font-semibold text-[var(--app-fg-strong)]">
                      {formatDate(s.started_at, 'time')}
                    </div>
                    <div className="app-wt-small mt-0.5 text-[13px] text-[var(--app-fg-muted)]">
                      {labelTitle(s.label)}
                    </div>
                  </div>
                  <div className="app-num shrink-0 text-[15px] text-[var(--app-fg-strong)]">
                    {formatDuration(s.duration_sec)}
                  </div>
                </li>
              ))}
            </ul>
          )}
          {sessions.length > 12 && (
            <Link
              to="/sessions"
              className="app-wt-small mt-3 inline-block text-[14px] text-[var(--app-fg-muted)] hover:text-[var(--app-fg)]"
            >
              See all {sessions.length.toLocaleString()} sessions →
            </Link>
          )}
        </Panel>

        <Panel aria-labelledby="gd-week" className="flex-[5_1_340px] self-start">
          <PanelHead
            id="gd-week"
            title="Last 7 days"
            action={
              <span className="app-num text-[17px] text-[var(--app-fg-strong)]">
                {formatHours(weekTotal)} h
              </span>
            }
          />
          <BarChart data={buckets} height={120} ariaLabel={`${name}: hours per day, last 7 days`} />
        </Panel>
      </div>
    </PageFrame>
  )
}

function BackLink() {
  return (
    <Link
      to="/library"
      className="app-wt-small mb-5 inline-flex h-8 items-center gap-1.5 rounded-[var(--app-r-1)] text-[14px] text-[var(--app-fg-muted)] transition-colors [transition-duration:var(--app-dur-1)] hover:text-[var(--app-fg)]"
    >
      <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
      Library
    </Link>
  )
}

function GameDetailSkeleton() {
  return (
    <PageFrame>
      <Skeleton className="mb-5 h-5 w-20" />
      <Skeleton className="h-[340px] rounded-[var(--app-r-art)]" />
      <Skeleton className="mt-6 h-[116px] rounded-[var(--app-r-3)]" />
      <div className="mt-6 flex flex-wrap gap-6">
        <Skeleton className="h-[360px] min-w-0 flex-[7_1_520px] rounded-[var(--app-r-3)]" />
        <Skeleton className="h-[220px] min-w-0 flex-[5_1_340px] rounded-[var(--app-r-3)]" />
      </div>
    </PageFrame>
  )
}
