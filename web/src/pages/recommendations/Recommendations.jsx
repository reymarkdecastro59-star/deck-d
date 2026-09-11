import { Lock, Sparkles } from 'lucide-react'
import { EmptyState } from '@/app/ui/EmptyState'
import { ErrorState } from '@/app/ui/ErrorState'
import { Skeleton } from '@/app/ui/Skeleton'
import { useRecommendations } from './useRecommendations'
import { RecCard } from './RecCard'

// Tier gating comes from backend thresholds — mirrored here in copy so the
// user knows what to do to unlock a tier, not just that it's missing.
// Backend: _GENRE_MIN_RESOLVED_GAMES = 3, _LLM_MIN_RESOLVED_GAMES = 5.
const GENRE_UNLOCK_MIN = 3
const TOP_PICKS_UNLOCK_MIN = 5

export default function Recommendations() {
  const { data, loading, error, reload } = useRecommendations()

  if (loading) return <RecommendationsSkeleton />

  if (error) {
    return (
      <div className="mx-auto max-w-[1280px] px-8 py-8">
        <ErrorState title="We couldn't load recommendations" description={error} onRetry={reload} />
      </div>
    )
  }

  const trending = data?.trending ?? []
  const genre = data?.genre_based ?? null
  const topPicks = data?.top_picks ?? null

  const anyContent =
    trending.length > 0 || (genre && genre.length > 0) || (topPicks && topPicks.length > 0)

  return (
    <div className="mx-auto max-w-[1280px] space-y-10 px-8 py-8">
      <header>
        <div className="app-eyebrow text-[var(--app-fg-muted)]">Recommendations</div>
        <h1
          className="mt-2 font-normal tracking-tight text-[var(--app-fg-strong)]"
          style={{ fontSize: 'clamp(24px, 2.4vw, 32px)', lineHeight: 1.1 }}
        >
          Games worth your time
        </h1>
        <p className="mt-2 max-w-[560px] text-[14px] text-[var(--app-fg-muted)]">
          Three tiers, gated on how much you've played. Nothing here is sponsored — picks come from
          what's trending today, what matches your genres, and what a curator-tuned model thinks
          you'll actually like.
        </p>
      </header>

      {!anyContent && (
        <EmptyState
          icon={<Sparkles className="h-8 w-8" strokeWidth={1.5} />}
          title="Recommendations warm up as you play"
          description="Log a few sessions and the three tiers below will fill in — trending picks first, then genre matches, then AI-curated picks."
        />
      )}

      {topPicks && topPicks.length > 0 && (
        <Section
          eyebrow="Top picks for you"
          title="Curated for your habits"
          lede="Two picks, chosen from your play history by an LLM and cross-checked against Metacritic (≥75). Refreshed daily."
        >
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {topPicks.map((g) => (
              <RecCard
                key={g.rawg_id ?? g.slug ?? g.name}
                game={g}
                reason={g.reason}
                variant="featured"
              />
            ))}
          </div>
        </Section>
      )}

      {!topPicks && (
        <LockedTier
          eyebrow="Top picks for you"
          title="Curated picks unlock at 5 tracked games"
          description={`Play a few more games — DECK'D needs at least ${TOP_PICKS_UNLOCK_MIN} games with resolvable metadata before the model can suggest something meaningful.`}
        />
      )}

      {genre && genre.length > 0 && (
        <Section
          eyebrow="Because you play"
          title="Genre matches"
          lede="From the top genres in your history, filtered against what you've already played."
        >
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {genre.map((g) => (
              <RecCard key={g.rawg_id ?? g.slug ?? g.name} game={g} />
            ))}
          </div>
        </Section>
      )}

      {!genre && (
        <LockedTier
          eyebrow="Because you play"
          title="Genre matches unlock at 3 tracked games"
          description={`We need at least ${GENRE_UNLOCK_MIN} games with resolvable metadata before genre matching kicks in.`}
        />
      )}

      {trending.length > 0 && (
        <Section
          eyebrow="Trending"
          title="What everyone's playing today"
          lede="Refreshed daily. Independent of your history — this tier is available from day one."
        >
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {trending.map((g) => (
              <RecCard key={g.rawg_id ?? g.slug ?? g.name} game={g} />
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}

function Section({ eyebrow, title, lede, children }) {
  return (
    <section className="space-y-4">
      <div>
        <div className="app-eyebrow text-[var(--app-fg-muted)]">{eyebrow}</div>
        <h2 className="mt-1 text-[18px] font-medium tracking-tight text-[var(--app-fg-strong)]">
          {title}
        </h2>
        {lede && (
          <p className="mt-1.5 max-w-[620px] text-[13px] leading-relaxed text-[var(--app-fg-muted)]">
            {lede}
          </p>
        )}
      </div>
      {children}
    </section>
  )
}

function LockedTier({ eyebrow, title, description }) {
  return (
    <section>
      <div className="bg-[var(--app-bg-2)]/50 flex items-start gap-4 rounded-[var(--app-r-3)] border border-dashed border-[var(--app-border)] p-6">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--app-r-2)] bg-[var(--app-bg-3)] text-[var(--app-fg-muted)]">
          <Lock className="h-5 w-5" strokeWidth={1.5} />
        </span>
        <div>
          <div className="app-eyebrow text-[var(--app-fg-muted)]">{eyebrow}</div>
          <h2 className="mt-1 text-[15px] font-medium text-[var(--app-fg)]">{title}</h2>
          <p className="mt-1.5 max-w-[560px] text-[13px] leading-relaxed text-[var(--app-fg-muted)]">
            {description}
          </p>
        </div>
      </div>
    </section>
  )
}

function RecommendationsSkeleton() {
  return (
    <div className="mx-auto max-w-[1280px] space-y-10 px-8 py-8">
      <div className="space-y-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-3/4 max-w-[560px]" />
      </div>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[16/9]" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[16/9]" />
        ))}
      </div>
    </div>
  )
}
