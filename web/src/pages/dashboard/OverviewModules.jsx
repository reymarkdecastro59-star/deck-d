import { Link } from 'react-router-dom'
import { ArrowRight, Check, Download } from 'lucide-react'
import { cn } from '@/app/ui/cn'
import { Art, ArtChip, ArtScrim } from '@/app/ui/Art'
import { Button } from '@/app/ui/Button'
import { Panel, PanelHead } from '@/app/ui/Panel'
import { GameStateMark, StageGlyph, StateShape, TrendMark } from '@/app/ui/brand'
import { WeekMeter, WeekTimeline } from '@/app/viz'
import { formatDuration, formatHours, relativeTime } from '@/lib/format'
import { STATE_LABEL } from '@/lib/gameState'
import { gameColor } from '@/lib/gameColor'
import { gameKey } from '@/pages/library/gameKey'

/*
 * Overview v2 modules (docs/brand/POST_AUTH_UX_V2_PLAN.md §5.2).
 * Story order: Track (hero, week, continue, sessions) → Understand
 * (momentum, insight) → Recommend (Next up, the page's peak-end finale).
 */

const ON_ART = 'text-[#F5F7F8]'
const SIG_ON_ART = '#55E6C1'

function ViewAll({ to, children }) {
  return (
    <Link
      to={to}
      className="app-wt-small inline-flex shrink-0 items-center gap-1.5 rounded-[var(--app-r-1)] text-[14px] text-[var(--app-fg-muted)] transition-colors [transition-duration:var(--app-dur-1)] hover:text-[var(--app-fg)]"
    >
      {children}
      <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
    </Link>
  )
}

function ArtButton({ to, children, solid }) {
  return (
    <Link
      to={to}
      className={cn(
        'inline-flex h-10 items-center gap-2 rounded-[var(--app-r-2)] px-4 text-[14px] font-semibold transition-colors [transition-duration:var(--app-dur-1)]',
        solid
          ? 'border border-[#F5F7F8] bg-[#F5F7F8] text-[#0B0D10] hover:bg-white'
          : 'border border-white/40 bg-[rgba(8,10,12,0.35)] text-[#F5F7F8] hover:border-white/70'
      )}
    >
      {children}
    </Link>
  )
}

/* ─── Hero: now playing, or your most-played game this week ─────────── */

export function HeroCard({ live, liveElapsed, game, weekHours, lastPlayed }) {
  const name = live?.game_name ?? game?.game ?? 'Unknown game'
  const to = game ? `/library/${gameKey(game)}` : '/sessions'
  return (
    <article
      aria-label={live ? `Now playing: ${name}` : `Most played this week: ${name}`}
      className="app-tile min-w-0 flex-[2_1_560px]"
    >
      <Art
        game={game}
        name={name}
        position="50% 35%"
        initial={false}
        className="app-frame flex h-full min-h-[340px] items-end rounded-[var(--app-r-art)] sm:min-h-[400px]"
      >
        <ArtScrim direction="left" />
        <div className={cn('relative flex w-full flex-col gap-3.5 p-6 sm:p-9', ON_ART)}>
          <div>
            {live ? (
              <ArtChip>
                <span
                  aria-hidden
                  className="app-live-dot h-2 w-2 rounded-full"
                  style={{ background: SIG_ON_ART }}
                />
                Now playing · {formatDuration(liveElapsed)}
                {live.device_name ? ` · ${live.device_name}` : ''}
              </ArtChip>
            ) : (
              <ArtChip>
                <StateShape state="active" color={SIG_ON_ART} />
                Active · last played {relativeTime(lastPlayed)}
              </ArtChip>
            )}
          </div>
          <h2 className="text-[34px] font-semibold leading-none tracking-[-0.035em] sm:text-[52px]">
            {name}
          </h2>
          <div className="flex flex-col gap-1">
            <span className="text-[16px] font-medium sm:text-[17px]">
              {live
                ? 'Session in progress · saved when you close the game'
                : `${formatHours(weekHours)} h this week · ${formatHours(game?.total_hours)} h total`}
            </span>
            {!live && (
              <span className="text-[14px] text-[#F5F7F8]/80 sm:text-[15px]">
                Your most-played game this week
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2.5 pt-1.5">
            <ArtButton to={to} solid>
              View history
            </ArtButton>
            <ArtButton to="/sessions">All sessions</ArtButton>
          </div>
        </div>
      </Art>
    </article>
  )
}

/* ─── This week: readout + Week Meter + play days ───────────────────── */

export function WeekPanel({ week, compact }) {
  const delta = week.deltaPct
  return (
    <Panel className="flex min-w-0 flex-[1_1_320px] flex-col gap-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[17px] font-semibold text-[var(--app-fg-strong)]">This week</h2>
        <span className="app-num text-[13px] text-[var(--app-fg-muted)]">
          {week.weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} –{' '}
          {new Date(week.weekStart.getTime() + 6 * 86_400_000).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
          })}
        </span>
      </div>
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        {/* Big readouts use Geist with tabular figures: mono spaces the decimal point awkwardly at display size. */}
        <span
          className="font-semibold tabular-nums leading-none tracking-[-0.045em] text-[var(--app-fg-strong)]"
          style={{ fontSize: compact ? 44 : 60 }}
        >
          {week.total.toFixed(1)}
          <span className="ml-1 text-[0.45em] text-[var(--app-fg-muted)]">h</span>
        </span>
        {delta != null && (
          <span className="app-wt-small inline-flex items-center gap-1 text-[14px] text-[var(--app-fg)]">
            <TrendMark trend={delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat'} />
            {Math.abs(delta)}% {delta >= 0 ? 'more' : 'less'} than last week
          </span>
        )}
      </div>
      <WeekMeter days={week.days} height={compact ? 72 : 96} compact={compact} />
      <div className="mt-auto flex flex-wrap justify-between gap-2 border-t border-[var(--app-hairline)] pt-3.5">
        <span className="text-[15px] font-semibold text-[var(--app-fg)]">
          {week.playDays} of {week.elapsedDays} play days
        </span>
        <span className="app-wt-small text-[14px] text-[var(--app-fg-muted)]">
          {week.gameCount} {week.gameCount === 1 ? 'game' : 'games'} · {week.sessionCount}{' '}
          {week.sessionCount === 1 ? 'session' : 'sessions'}
        </span>
      </div>
    </Panel>
  )
}

/* ─── Continue shelf ────────────────────────────────────────────────── */

export function ContinueShelf({ items }) {
  if (!items.length) return null
  return (
    <section aria-labelledby="ov-continue" className="pt-12">
      <PanelHead
        id="ov-continue"
        title="Continue"
        description="Games you're in the middle of, by recent momentum"
        action={<ViewAll to="/library">Library</ViewAll>}
      />
      {/* Phone: a horizontal shelf (Hick: one row to scan). sm+: a grid of ≥180px covers. */}
      <ul className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:snap-none sm:grid-cols-[repeat(auto-fill,minmax(180px,1fr))] sm:gap-6 sm:overflow-visible sm:px-0 sm:pb-0">
        {items.map((it) => (
          <li key={gameKey(it.game)} className="w-[140px] shrink-0 snap-start sm:w-auto">
            <ContinueTile {...it} />
          </li>
        ))}
      </ul>
    </section>
  )
}

function ContinueTile({ game, state, thisWeek, trend, lastPlayed }) {
  const name = game.game || 'Untitled'
  const meta =
    thisWeek > 0
      ? `${formatHours(thisWeek)} h this week`
      : `Last played ${relativeTime(lastPlayed)}`
  return (
    <Link
      to={`/library/${gameKey(game)}`}
      className="app-tile flex flex-col gap-3 rounded-[var(--app-r-3)]"
    >
      <Art game={game} className="app-frame aspect-[3/4] rounded-[var(--app-r-3)]">
        <ArtScrim strength={0.7} />
        <span className="absolute bottom-2.5 left-2.5">
          <ArtChip className="h-7 px-2.5">
            <StateShape
              state={state}
              color={state === 'active' ? SIG_ON_ART : state === 'drifting' ? '#F4B860' : '#A9B2BB'}
            />
            {STATE_LABEL[state]}
          </ArtChip>
        </span>
      </Art>
      <span className="flex flex-col gap-1">
        <span className="truncate text-[16px] font-semibold text-[var(--app-fg-strong)]">
          {name}
        </span>
        <span className="app-wt-small flex items-center gap-1.5 text-[14px] text-[var(--app-fg-muted)]">
          <TrendMark trend={trend} />
          {meta}
        </span>
      </span>
    </Link>
  )
}

/* ─── This week's sessions (timeline + latest) ──────────────────────── */

export function SessionsPanel({ week, gamesByName, live, latest, compact }) {
  const games = [...new Set(week.days.flatMap((d) => d.spans.map((s) => s.game)))].slice(0, 6)
  const liveSpan = live
    ? {
        game: live.game_name,
        start: (() => {
          const d = new Date(live.started_at * 1000)
          return d.getHours() + d.getMinutes() / 60
        })(),
      }
    : null
  return (
    <Panel aria-labelledby="ov-sessions" className="flex-[7_1_520px]">
      <PanelHead
        id="ov-sessions"
        title="This week's sessions"
        action={<ViewAll to="/sessions">All sessions</ViewAll>}
      />
      <WeekTimeline days={week.days} gamesByName={gamesByName} live={liveSpan} compact={compact} />
      {games.length > 0 && (
        <ul aria-label="Games this week" className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
          {games.map((g) => (
            <li
              key={g}
              className="app-wt-small flex items-center gap-2 text-[13px] text-[var(--app-fg-muted)]"
            >
              <span
                aria-hidden
                className="h-3 w-3 rounded-[3px]"
                style={{ background: gameColor(gamesByName.get(g) ?? g) }}
              />
              {g}
            </li>
          ))}
        </ul>
      )}
      {(live || latest) && (
        <div className="mt-4 border-t border-[var(--app-hairline)] pt-2">
          <Link
            to="/sessions"
            className="-mx-2.5 flex items-center gap-3 rounded-[var(--app-r-2)] px-2.5 py-2.5 transition-colors [transition-duration:var(--app-dur-1)] hover:bg-[var(--app-bg-3)]"
          >
            <Art
              game={gamesByName.get(live?.game_name ?? latest.game_name)}
              name={live?.game_name ?? latest.game_name}
              className="h-[43px] w-8 shrink-0 rounded-[3px]"
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-semibold text-[var(--app-fg-strong)]">
                {live?.game_name ?? latest.game_name}
              </span>
              <span className="app-wt-small block text-[13px] text-[var(--app-fg-muted)]">
                {live
                  ? 'Playing now'
                  : `Latest session · ${relativeTime(latest.ended_at ?? latest.started_at)}`}
              </span>
            </span>
            {!live && (
              <span className="app-num text-[15px] text-[var(--app-fg-strong)]">
                {formatDuration(latest.duration_sec)}
              </span>
            )}
          </Link>
        </div>
      )}
    </Panel>
  )
}

/* ─── Momentum ─────────────────────────────────────────────────────── */

export function MomentumPanel({ rows }) {
  if (!rows.length) return null
  const max = Math.max(...rows.map((r) => r.game.decay_hours ?? 0), 0.1)
  const fill = {
    active: 'var(--app-accent)',
    drifting: 'var(--app-drift)',
    dormant: 'var(--app-fg-dim)',
  }
  return (
    <Panel aria-labelledby="ov-momentum" className="flex-[5_1_380px]">
      <PanelHead
        id="ov-momentum"
        title="Momentum"
        description="Recent play counts more; it halves every 14 days"
        action={<ViewAll to="/stats">Stats</ViewAll>}
      />
      <ul className="-mx-2.5">
        {rows.map(({ game, state, trend }) => (
          <li key={gameKey(game)}>
            <Link
              to={`/library/${gameKey(game)}`}
              className="grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3.5 rounded-[var(--app-r-2)] px-2.5 py-2 transition-colors [transition-duration:var(--app-dur-1)] hover:bg-[var(--app-bg-3)]"
            >
              <Art game={game} className="h-12 w-9 rounded-[4px]" />
              <span className="flex min-w-0 flex-col gap-2">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-[15px] font-semibold text-[var(--app-fg-strong)]">
                    {game.game}
                  </span>
                  <GameStateMark state={state} hideLabel={state === 'active'} />
                </span>
                <span aria-hidden className="block h-2.5 rounded-[3px] bg-[var(--app-bg-3)]">
                  <span
                    className="block h-2.5 rounded-[3px]"
                    style={{
                      width: `${Math.max(3, ((game.decay_hours ?? 0) / max) * 100)}%`,
                      background: fill[state],
                    }}
                  />
                </span>
              </span>
              <span className="flex items-center gap-1.5">
                <TrendMark trend={trend} />
                <span className="app-num text-[15px] text-[var(--app-fg-strong)]">
                  {formatHours(game.decay_hours)} h
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Panel>
  )
}

/* ─── Insight (Understand → identity mirror) ────────────────────────── */

export function InsightPanel({ insight }) {
  if (!insight) return null
  const bars = insight.bars ?? []
  const max = Math.max(...bars, insight.threshold ?? 0, 1)
  return (
    <Panel aria-label="Insight" className="mt-6">
      <div className="flex flex-wrap items-center gap-8">
        <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-2.5">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-[var(--app-fg-muted)]">
            <StageGlyph name="understand" className="text-[var(--app-accent)]" />
            Insight
          </div>
          <p className="max-w-[720px] text-[20px] font-medium leading-[1.35] tracking-[-0.01em] text-[var(--app-fg-strong)] sm:text-[22px]">
            {insight.text}
          </p>
          <ViewAll to="/stats">See your patterns</ViewAll>
        </div>
        {bars.length > 0 && (
          <figure className="flex min-w-[200px] flex-[0_1_260px] flex-col gap-2">
            <div
              role="img"
              aria-label={`${bars.length} sessions; reference line at ${insight.threshold} minutes`}
              className="relative flex h-[72px] items-end gap-1 border-b border-[var(--app-border)]"
            >
              {bars.map((m, i) => (
                <span
                  key={i}
                  className="flex-1 rounded-t-[2px]"
                  style={{
                    height: `${Math.max(4, (m / max) * 100)}%`,
                    background:
                      m <= (insight.threshold ?? Infinity)
                        ? 'var(--app-accent)'
                        : 'var(--app-border-strong)',
                  }}
                />
              ))}
              {insight.threshold && (
                <span
                  aria-hidden
                  className="absolute inset-x-0 border-t border-dashed border-[var(--app-fg-muted)]"
                  style={{ bottom: `${(insight.threshold / max) * 100}%` }}
                />
              )}
            </div>
            <figcaption className="app-num flex justify-between text-[12px] text-[var(--app-fg-muted)]">
              <span>{bars.length} sessions</span>
              <span>– – {insight.threshold} min</span>
            </figcaption>
          </figure>
        )}
      </div>
    </Panel>
  )
}

/* ─── Next up (the finale) ──────────────────────────────────────────── */

export function NextUpBanner({ pick, compact }) {
  if (!pick) return null
  return (
    <section aria-label="Next up" className="app-tile mt-6">
      <Art
        game={pick}
        name={pick.name}
        initial={false}
        position="50% 40%"
        className="app-frame flex min-h-[300px] items-center rounded-[var(--app-r-art)] sm:min-h-[340px]"
      >
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(90deg, rgba(8,10,12,.92) 0%, rgba(8,10,12,.78) 42%, rgba(8,10,12,.15) 82%)',
          }}
        />
        <div
          className={cn(
            'relative flex max-w-[640px] flex-col gap-3.5',
            compact ? 'p-5' : 'p-6 sm:p-10',
            ON_ART
          )}
        >
          <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#F5F7F8]/85">
            <span className="inline-flex" style={{ color: SIG_ON_ART }}>
              <StageGlyph name="recommend" />
            </span>
            Next up · picked from your play history
          </span>
          <div className="flex flex-wrap items-baseline gap-3.5">
            <h2 className="text-[30px] font-semibold leading-none tracking-[-0.03em] sm:text-[44px]">
              {pick.name}
            </h2>
            {pick.metacritic != null && (
              <span className="app-num text-[14px] text-[#F5F7F8]/80">MC {pick.metacritic}</span>
            )}
          </div>
          {pick.reason && (
            <p className="text-[15px] leading-[1.5] text-[#F5F7F8]/90 sm:text-[17px]">
              {pick.reason}
            </p>
          )}
          <div className="flex flex-wrap gap-2.5 pt-1.5">
            <ArtButton to="/for-you" solid>
              See all picks
            </ArtButton>
          </div>
        </div>
      </Art>
    </section>
  )
}

/* ─── First run: endowed-progress onboarding (UX v2 R17) ────────────── */

export function FirstRun() {
  const steps = [
    { title: 'Account created', done: true },
    {
      title: 'Install the DECK’D tracker',
      body: 'It runs in your Windows tray and notices which game is running and for how long.',
      current: true,
    },
    {
      title: 'Play anything',
      body: 'Steam, Epic, GOG, Xbox or standalone. Your first session appears when you close the game.',
    },
    {
      title: 'Track 3 games',
      body: 'Unlocks Genre matches: well-reviewed games in the genres you play most.',
    },
    {
      title: 'Track 5 games',
      body: 'Unlocks Top picks: two picks a day, each with the reason it was chosen.',
    },
  ]
  return (
    <div className="flex flex-wrap gap-12 pt-4">
      <ol className="relative min-w-0 flex-[1_1_520px]">
        <span
          aria-hidden
          className="absolute bottom-10 left-[7px] top-4 w-px bg-[var(--app-border)]"
        />
        {steps.map((s, i) => (
          <li key={s.title} className="relative grid grid-cols-[16px_1fr] gap-4 pb-8">
            <span
              aria-hidden
              className={cn(
                'mt-1 flex h-4 w-4 items-center justify-center rounded-full',
                s.done || s.current
                  ? 'bg-[var(--app-accent)] text-[var(--app-on-accent)]'
                  : 'border-[1.5px] border-[var(--app-fg-dim)] bg-[var(--app-bg)]'
              )}
            >
              {s.done && <Check className="h-3 w-3" strokeWidth={3} />}
            </span>
            <div className="flex flex-col gap-1.5">
              <span className="app-num text-[13px] text-[var(--app-fg-muted)]">
                Step {i + 1} of {steps.length}
                {s.done ? ' · done' : ''}
              </span>
              <span
                className={cn(
                  'font-semibold',
                  s.current
                    ? 'text-[20px] text-[var(--app-fg-strong)]'
                    : 'text-[16px] text-[var(--app-fg)]'
                )}
              >
                {s.title}
              </span>
              {s.body && (
                <p className="max-w-[560px] text-[15px] leading-[1.5] text-[var(--app-fg-muted)]">
                  {s.body}
                </p>
              )}
              {s.current && (
                <div className="flex flex-wrap gap-2.5 pt-2">
                  <Button
                    as={Link}
                    to="/devices"
                    variant="primary"
                    leadingIcon={<Download className="h-4 w-4" />}
                  >
                    Install tracker
                  </Button>
                  <Button as={Link} to="/for-you" variant="ghost">
                    Browse picks while you wait
                  </Button>
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>
      <aside className="flex max-w-[360px] flex-[1_1_280px] flex-col gap-3 border-l border-[var(--app-hairline)] pl-6">
        <span className="text-[13px] font-semibold text-[var(--app-fg-muted)]">
          What gets recorded
        </span>
        <p className="text-[15px] leading-[1.55] text-[var(--app-fg-muted)]">
          The game that is running, when it starts and stops, and which of your devices it ran on.
        </p>
        <ViewAll to="/settings">Export or delete it any time</ViewAll>
      </aside>
    </div>
  )
}
