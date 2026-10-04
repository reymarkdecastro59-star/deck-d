import { useMemo } from 'react'
import { ErrorState } from '@/app/ui/ErrorState'
import { Skeleton } from '@/app/ui/Skeleton'
import { safeImageUrl } from '@/app/ui/safeUrl'
import { useTracking } from '@/app/shell/trackingContext'
import { useElapsed } from '@/app/shell/useElapsed'
import { gameColor } from '@/lib/gameColor'
import { gameState, lastPlayedByGame } from '@/lib/gameState'
import { pickInsight } from '@/lib/insights'
import { trendOf, weekSummary, weeklyByGame } from '@/lib/week'
import { useDashboard, useNextUp } from './useDashboard'
import {
  ContinueShelf,
  FirstRun,
  HeroCard,
  InsightPanel,
  MomentumPanel,
  NextUpBanner,
  SessionsPanel,
  WeekPanel,
} from './OverviewModules'

/**
 * Overview v2 — psychology-led daily brief (docs/brand/POST_AUTH_UX_V2_PLAN.md).
 *
 *   Hero (now playing / most played)  +  This week (Week Meter, play days)
 *   Continue shelf (≤5, art-first)
 *   This week's sessions timeline     +  Momentum
 *   Insight (identity mirror)
 *   Next up (peak-end finale)
 *
 * Everything is derived from data the API already returns; nothing invented.
 */
export default function Dashboard() {
  const { summary, recent, loading, error, reload } = useDashboard()
  const { live } = useTracking()
  const liveElapsed = useElapsed(live?.started_at)
  const hasData = (summary?.total_sessions ?? 0) > 0
  const nextUp = useNextUp(!loading && !error && hasData)

  const model = useMemo(() => buildModel(summary, recent, live), [summary, recent, live])

  if (loading) return <OverviewSkeleton />
  if (error) {
    return (
      <Page>
        <Greeting />
        <ErrorState title="We couldn't load your overview" description={error} onRetry={reload} />
      </Page>
    )
  }

  if (!hasData) {
    return (
      <Page>
        <div className="flex flex-col gap-3 pb-8">
          <h1 className="text-[34px] font-semibold leading-tight tracking-[-0.03em] text-[var(--app-fg-strong)] sm:text-[44px]">
            <span className="sr-only">Overview: </span>Let&apos;s record your first session.
          </h1>
          <p className="max-w-[640px] text-[16px] leading-[1.55] text-[var(--app-fg-muted)]">
            DECK&apos;D builds your history from the games you actually play, then uses it to
            suggest what to play next.
          </p>
        </div>
        <FirstRun />
      </Page>
    )
  }

  const { week, heroGame, continueItems, momentumRows, gamesByName, lastPlayed, perGame } = model

  return (
    <Page ambient={live ? (gamesByName.get(live.game_name) ?? live.game_name) : heroGame}>
      <Greeting />

      <div className="flex flex-wrap items-stretch gap-6">
        <HeroCard
          live={live}
          liveElapsed={liveElapsed}
          game={live ? gamesByName.get(live.game_name) : heroGame}
          weekHours={heroGame ? (perGame.get(heroGame.game)?.thisWeek ?? 0) : 0}
          lastPlayed={heroGame ? lastPlayed.get(heroGame.game) : null}
        />
        <WeekPanel week={week} />
      </div>

      <ContinueShelf items={continueItems} />

      <div className="flex flex-wrap gap-6 pt-12">
        <SessionsPanel week={week} gamesByName={gamesByName} live={live} latest={recent[0]} />
        <MomentumPanel rows={momentumRows} />
      </div>

      <InsightPanel insight={model.insight} />

      {nextUp.loading ? (
        <Skeleton className="mt-6 h-[300px] rounded-[var(--app-r-art)]" />
      ) : (
        <NextUpBanner pick={nextUp.pick} />
      )}

      <p className="app-wt-small mt-12 text-[13px] text-[var(--app-fg-muted)]">
        Game data and images from{' '}
        <a
          href="https://rawg.io"
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-[3px] hover:text-[var(--app-fg)]"
        >
          RAWG
        </a>
        .
      </p>
    </Page>
  )
}

/* ─── model ───────────────────────────────────────────────────────── */

function buildModel(summary, recent, live) {
  const now = Date.now()
  const games = summary?.games ?? [] // already ordered by momentum (decay) desc
  const gamesByName = new Map(games.filter((g) => g?.game).map((g) => [g.game, g]))
  const lastPlayed = lastPlayedByGame(recent)
  const perGame = weeklyByGame(recent)
  const week = weekSummary(recent)

  const stateOf = (g) => gameState(lastPlayed.get(g.game), now)
  const trendFor = (g) => {
    const w = perGame.get(g.game)
    return w ? trendOf(w.thisWeek, w.lastWeek) : 'flat'
  }

  // Hero = most played this week; falls back to top momentum when the week is empty.
  const byWeek = [...games].sort(
    (a, b) => (perGame.get(b.game)?.thisWeek ?? 0) - (perGame.get(a.game)?.thisWeek ?? 0)
  )
  const heroGame =
    (perGame.get(byWeek[0]?.game)?.thisWeek ?? 0) > 0 ? byWeek[0] : (games[0] ?? null)
  const heroName = live?.game_name ?? heroGame?.game

  const continueItems = games
    .filter((g) => g.game !== heroName && stateOf(g) !== 'dormant')
    .slice(0, 5)
    .map((g) => ({
      game: g,
      state: stateOf(g),
      thisWeek: perGame.get(g.game)?.thisWeek ?? 0,
      trend: trendFor(g),
      lastPlayed: lastPlayed.get(g.game),
    }))

  const momentumRows = games
    .slice(0, 5)
    .map((g) => ({ game: g, state: stateOf(g), trend: trendFor(g) }))

  return {
    week,
    heroGame,
    continueItems,
    momentumRows,
    gamesByName,
    lastPlayed,
    perGame,
    insight: pickInsight(recent, now),
  }
}

/* ─── layout ──────────────────────────────────────────────────────── */

function Page({ children, ambient }) {
  return (
    <div className="relative">
      {ambient && <AmbientTint game={ambient} />}
      <div className="relative mx-auto w-full max-w-[1600px] px-4 pb-16 pt-2 sm:px-6 lg:px-10">
        {children}
      </div>
    </div>
  )
}

/**
 * Art-derived atmosphere behind the top of the page (brand amendment: colour
 * from game art is allowed; decorative gradients are not). Uses the hero art
 * itself, heavily blurred, until the backend ships a dominant colour (B11).
 */
function AmbientTint({ game }) {
  const url = safeImageUrl(game?.background_image)
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 h-[640px] overflow-hidden"
      style={{
        opacity: 'var(--app-amb-opacity)',
        // Fade in from the top bar edge and out by the shelf: no hard seam.
        maskImage: 'linear-gradient(to bottom, transparent 0%, black 18%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 18%, transparent 100%)',
      }}
    >
      {url ? (
        <img
          src={url}
          alt=""
          className="h-full w-full scale-125 object-cover blur-[90px] saturate-150"
        />
      ) : (
        <div
          className="h-full w-full"
          style={{
            background: `radial-gradient(70% 90% at 30% 0%, ${gameColor(game)} 0%, transparent 70%)`,
          }}
        />
      )}
    </div>
  )
}

function isoWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const day = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d - yearStart) / 86_400_000 + 1) / 7)
}

function Greeting() {
  const now = new Date()
  const h = now.getHours()
  const greeting =
    h < 5 ? 'Good night' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 pb-6 pt-2">
      <h1 className="text-[26px] font-semibold tracking-[-0.02em] text-[var(--app-fg-strong)] sm:text-[28px]">
        <span className="sr-only">Overview: </span>
        {greeting}
      </h1>
      <span className="app-wt-small text-[14px] text-[var(--app-fg-muted)]">
        {now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })} ·
        Week {isoWeek(now)}
      </span>
    </div>
  )
}

function OverviewSkeleton() {
  return (
    <Page>
      <Skeleton className="mb-6 mt-2 h-7 w-48" />
      <div className="flex flex-wrap gap-6">
        <Skeleton className="h-[400px] min-w-0 flex-[2_1_560px] rounded-[var(--app-r-art)]" />
        <Skeleton className="h-[400px] min-w-0 flex-[1_1_320px] rounded-[var(--app-r-3)]" />
      </div>
      <Skeleton className="mb-5 mt-12 h-6 w-40" />
      <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[3/4] rounded-[var(--app-r-3)]" />
        ))}
      </div>
      <div className="flex flex-wrap gap-6 pt-12">
        <Skeleton className="h-[360px] min-w-0 flex-[7_1_520px] rounded-[var(--app-r-3)]" />
        <Skeleton className="h-[360px] min-w-0 flex-[5_1_380px] rounded-[var(--app-r-3)]" />
      </div>
      <span className="sr-only">Loading overview</span>
    </Page>
  )
}
