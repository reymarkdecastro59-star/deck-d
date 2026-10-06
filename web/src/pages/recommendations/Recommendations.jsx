import { Link } from 'react-router-dom'
import { Lock, Sparkles } from 'lucide-react'
import { Button } from '@/app/ui/Button'
import { EmptyState } from '@/app/ui/EmptyState'
import { ErrorState } from '@/app/ui/ErrorState'
import { PageFrame, PageHeader } from '@/app/ui/PageHeader'
import { Panel } from '@/app/ui/Panel'
import { SectionHead } from '@/app/ui/SectionHead'
import { Skeleton } from '@/app/ui/Skeleton'
import { useRecommendations } from './useRecommendations'
import { RecCard } from './RecCard'
import { RecommendTabs } from '@/pages/trending/RecommendTabs'

const GENRE_UNLOCK_MIN = 3
const TOP_PICKS_UNLOCK_MIN = 5

/**
 * For You (UX v2 §5.7): top picks as landscape banners (the page's focal
 * point), then genre matches as a cover shelf. Trending is its own screen. A tier that
 * isn't available yet says so plainly in a panel — it never shows grey
 * placeholder tiles, which read as "still loading".
 */
export default function Recommendations({ tabsBase = '' }) {
  const { data, loading, error, reload } = useRecommendations()

  if (loading) return <RecommendationsSkeleton />

  if (error) {
    return (
      <PageFrame>
        <Header tabsBase={tabsBase} />
        <ErrorState title="We couldn't load recommendations" description={error} onRetry={reload} />
      </PageFrame>
    )
  }

  const genre = data?.genre_based ?? null
  const topPicks = data?.top_picks ?? null
  const anyContent = (genre?.length || 0) + (topPicks?.length || 0) > 0

  return (
    <PageFrame>
      <Header tabsBase={tabsBase} />

      {!anyContent && (
        <EmptyState
          icon={<Sparkles className="h-8 w-8" strokeWidth={1.5} />}
          title="Recommendations warm up as you play"
          description="Play a few games with the tracker running, or import your launcher playtime in Settings. Genre matches come first, then picks made for you."
        />
      )}

      {topPicks && topPicks.length > 0 && (
        <Tier
          id="fy-top"
          title="Picked for you"
          description="Chosen from your play history and checked against critic scores. Refreshed daily."
        >
          <div className="flex flex-wrap gap-6">
            {topPicks.map((g) => (
              <RecCard
                key={g.rawg_id ?? g.slug ?? g.name}
                game={g}
                reason={g.reason}
                variant="featured"
                className="flex-[1_1_480px]"
              />
            ))}
          </div>
        </Tier>
      )}

      {!topPicks && (
        <LockedTier
          title="Picked for you"
          unlock={`Unlocks after ${TOP_PICKS_UNLOCK_MIN} tracked games`}
          description="Once DECK'D knows a handful of the games you play, it picks titles that fit how you play, not just what's popular."
        />
      )}

      {genre && genre.length > 0 && (
        <Tier
          id="fy-genre"
          title="Because you play these genres"
          description="From the genres you spend the most time in, minus games you already have."
        >
          <TileGrid>
            {genre.map((g) => (
              <RecCard key={g.rawg_id ?? g.slug ?? g.name} game={g} />
            ))}
          </TileGrid>
        </Tier>
      )}

      {!genre && (
        <LockedTier
          title="Because you play these genres"
          unlock={`Unlocks after ${GENRE_UNLOCK_MIN} tracked games`}
          description="Genre matches need a few games with known genres to compare against."
        />
      )}

      <p className="app-wt-small mt-12 text-[13px] text-[var(--app-fg-muted)]">
        Nothing here is sponsored. Game data and images from{' '}
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
    </PageFrame>
  )
}

function Header({ tabsBase }) {
  return (
    <PageHeader
      title="For You"
      lede="Games picked from what you actually play."
      toolbar={<RecommendTabs base={tabsBase} />}
    />
  )
}

function Tier({ id, title, description, children }) {
  return (
    <section aria-labelledby={id} className="mt-12 first-of-type:mt-0">
      <SectionHead id={id} title={title} description={description} />
      {children}
    </section>
  )
}

function LockedTier({ title, unlock, description }) {
  return (
    <section aria-label={`${title} (locked)`} className="mt-12">
      <Panel className="flex flex-wrap items-center gap-x-6 gap-y-4">
        <span
          aria-hidden
          className="grid h-12 w-12 shrink-0 place-items-center rounded-[var(--app-r-3)] bg-[var(--app-bg-3)] text-[var(--app-fg-muted)]"
        >
          <Lock className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-[1_1_320px]">
          <h2 className="text-[20px] font-semibold tracking-[-0.015em] text-[var(--app-fg-strong)]">
            {title}
          </h2>
          <p className="app-wt-small mt-1 text-[15px] text-[var(--app-fg-muted)]">
            <span className="font-semibold text-[var(--app-fg)]">{unlock}.</span> {description}
          </p>
        </div>
        <Button as={Link} to="/library" variant="secondary">
          See your library
        </Button>
      </Panel>
    </section>
  )
}

function TileGrid({ children }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-[repeat(auto-fill,minmax(180px,1fr))] sm:gap-x-6 sm:gap-y-10">
      {children}
    </div>
  )
}

function RecommendationsSkeleton() {
  return (
    <PageFrame>
      <Header />
      <Skeleton className="mt-10 h-6 w-56" />
      <div className="mt-5 flex flex-wrap gap-6">
        <Skeleton className="h-[320px] min-w-0 flex-[1_1_480px] rounded-[var(--app-r-art)]" />
        <Skeleton className="h-[320px] min-w-0 flex-[1_1_480px] rounded-[var(--app-r-art)]" />
      </div>
    </PageFrame>
  )
}
