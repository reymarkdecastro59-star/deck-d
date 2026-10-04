import { Lock, Sparkles } from 'lucide-react'
import { EmptyState } from '@/app/ui/EmptyState'
import { ErrorState } from '@/app/ui/ErrorState'
import { SectionHead } from '@/app/ui/SectionHead'
import { Skeleton } from '@/app/ui/Skeleton'
import { useRecommendations } from './useRecommendations'
import { RecCard } from './RecCard'

const GENRE_UNLOCK_MIN = 3
const TOP_PICKS_UNLOCK_MIN = 5

/**
 * Recommendations — three tiers, each with a quiet SectionHead and a
 * cover-first grid (or an editorial split for the top-picks tier). No
 * card wrappers, no giant lede paragraphs. Locked tiers show a muted
 * silhouette preview beneath their heading so users understand what will
 * eventually appear there.
 */
export default function Recommendations() {
  const { data, loading, error, reload } = useRecommendations()

  if (loading) return <RecommendationsSkeleton />

  if (error) {
    return (
      <Container>
        <Header />
        <div className="mt-6">
          <ErrorState
            title="We couldn't load recommendations"
            description={error}
            onRetry={reload}
          />
        </div>
      </Container>
    )
  }

  const trending = data?.trending ?? []
  const genre = data?.genre_based ?? null
  const topPicks = data?.top_picks ?? null
  const anyContent = trending.length + (genre?.length || 0) + (topPicks?.length || 0) > 0

  return (
    <Container>
      <Header />

      {!anyContent && (
        <div className="mt-8">
          <EmptyState
            icon={<Sparkles className="h-8 w-8" strokeWidth={1.5} />}
            title="Recommendations warm up as you play"
            description="Log a few sessions and the three tiers below will fill in — trending picks first, then genre matches, then AI-curated picks."
          />
        </div>
      )}

      {topPicks && topPicks.length > 0 && (
        <Tier
          eyebrow="Top picks for you"
          title="Curated for your habits"
          lede="Two picks, chosen from your play history by an LLM and cross-checked against Metacritic (≥75). Refreshed daily."
        >
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            {topPicks.map((g) => (
              <RecCard
                key={g.rawg_id ?? g.slug ?? g.name}
                game={g}
                reason={g.reason}
                variant="featured"
              />
            ))}
          </div>
        </Tier>
      )}

      {!topPicks && (
        <LockedTier
          eyebrow="Top picks for you"
          title={`Curated picks unlock at ${TOP_PICKS_UNLOCK_MIN} tracked games`}
          description={`Play a few more games — DECK'D needs at least ${TOP_PICKS_UNLOCK_MIN} games with resolvable metadata before the model can suggest something meaningful.`}
          previewCount={2}
          featured
        />
      )}

      {genre && genre.length > 0 && (
        <Tier
          eyebrow="Because you play"
          title="Genre matches"
          lede="From the top genres in your history, filtered against what you've already played."
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
          eyebrow="Because you play"
          title={`Genre matches unlock at ${GENRE_UNLOCK_MIN} tracked games`}
          description={`We need at least ${GENRE_UNLOCK_MIN} games with resolvable metadata before genre matching kicks in.`}
        />
      )}

      {trending.length > 0 && (
        <Tier
          eyebrow="Trending"
          title="What everyone's playing today"
          lede="Refreshed daily. Independent of your history — this tier is available from day one."
        >
          <TileGrid>
            {trending.map((g) => (
              <RecCard key={g.rawg_id ?? g.slug ?? g.name} game={g} />
            ))}
          </TileGrid>
        </Tier>
      )}
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

function Header() {
  return (
    <div>
      <h1
        className="font-normal tracking-tight text-[var(--app-fg-strong)]"
        style={{ fontSize: 'clamp(20px, 1.8vw, 26px)' }}
      >
        For you
      </h1>
      <p className="mt-2 max-w-[640px] text-[13px] leading-relaxed text-[var(--app-fg-muted)]">
        Three tiers, gated on how much you've played. Nothing here is sponsored — picks come from
        what's trending, what matches your genres, and what a curator-tuned model thinks you'll
        actually like.
      </p>
    </div>
  )
}

function Tier({ eyebrow, title, lede, children }) {
  return (
    <section className="mt-12">
      <SectionHead eyebrow={eyebrow} title={title} />
      {lede && (
        <p className="mt-2 max-w-[620px] text-[12.5px] leading-relaxed text-[var(--app-fg-muted)]">
          {lede}
        </p>
      )}
      <div className="mt-5">{children}</div>
    </section>
  )
}

function LockedTier({ eyebrow, title, description, previewCount = 4, featured }) {
  return (
    <section className="mt-12">
      <div className="flex items-center gap-2">
        <div className="app-eyebrow text-[10px] text-[var(--app-fg-dim)]">{eyebrow}</div>
        <Lock className="h-3 w-3 text-[var(--app-fg-dim)]" strokeWidth={2} />
      </div>
      <h2 className="mt-1 text-[15px] font-medium tracking-tight text-[var(--app-fg-strong)]">
        {title}
      </h2>
      <p className="mt-2 max-w-[620px] text-[12.5px] leading-relaxed text-[var(--app-fg-muted)]">
        {description}
      </p>
      <div
        aria-hidden
        className={
          featured
            ? 'mt-5 grid grid-cols-1 gap-8 opacity-40 md:grid-cols-2'
            : 'mt-5 grid grid-cols-2 gap-x-4 gap-y-8 opacity-40 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'
        }
      >
        {Array.from({ length: previewCount }).map((_, i) => (
          <div key={i}>
            <div className="aspect-[3/4] rounded-[var(--app-r-2)] bg-[var(--app-bg-3)]" />
            <div className="mt-2.5 h-3 w-3/4 rounded-full bg-[var(--app-bg-3)]" />
            <div className="mt-1.5 h-2.5 w-1/2 rounded-full bg-[var(--app-bg-3)]" />
          </div>
        ))}
      </div>
    </section>
  )
}

function TileGrid({ children }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {children}
    </div>
  )
}

function RecommendationsSkeleton() {
  return (
    <Container>
      <Skeleton className="h-6 w-32" />
      <Skeleton className="mt-3 h-3 w-3/4 max-w-[560px]" />
      <div className="mt-12 space-y-3">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-5 w-56" />
      </div>
      <div className="mt-5 grid grid-cols-1 gap-8 md:grid-cols-2">
        <Skeleton className="aspect-[3/4]" />
        <Skeleton className="aspect-[3/4]" />
      </div>
      <div className="mt-12 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[3/4]" />
        ))}
      </div>
    </Container>
  )
}
