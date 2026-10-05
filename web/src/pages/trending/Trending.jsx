import { useMemo } from 'react'
import { Flame } from 'lucide-react'
import { apiFetch } from '@/api/client'
import { useApiResource } from '@/app/hooks/useApiResource'
import { Art, ArtChip, ArtScrim } from '@/app/ui/Art'
import { EmptyState } from '@/app/ui/EmptyState'
import { ErrorState } from '@/app/ui/ErrorState'
import { PageFrame, PageHeader } from '@/app/ui/PageHeader'
import { Panel } from '@/app/ui/Panel'
import { Skeleton } from '@/app/ui/Skeleton'
import { RecommendTabs } from './RecommendTabs'
import { useTrending } from './useTrending'

const loose = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '')

/**
 * Trending (UX v2 §5.7) — what's popular right now (Steam's most-played
 * chart, refreshed every 6 hours; RAWG recent releases as a fallback), the
 * same for everyone and separate from the personal For You screen. Top three as large landscape tiles with
 * editorial rank numerals, the rest as a ranked list. Games already in the
 * user's library are marked, so the list answers "what's new to me?".
 */
export default function Trending({ tabsBase = '' }) {
  const { data, loading, error, reload } = useTrending()
  const library = useApiResource(() => apiFetch('/dashboard'))
  const owned = useMemo(
    () => new Set((library.data?.games ?? []).map((g) => loose(g.game))),
    [library.data]
  )

  const games = data?.trending ?? []
  const header = (
    <PageHeader
      title="Trending"
      lede="The most played games right now. The same list for everyone, not based on your play."
      toolbar={<RecommendTabs base={tabsBase} />}
    />
  )

  if (loading) {
    return (
      <PageFrame>
        {header}
        <div className="flex flex-wrap gap-6">
          {[0, 1, 2].map((i) => (
            <Skeleton
              key={i}
              className="aspect-[16/10] min-w-0 flex-[1_1_300px] rounded-[var(--app-r-art)]"
            />
          ))}
        </div>
        <Skeleton className="mt-6 h-[320px] rounded-[var(--app-r-3)]" />
      </PageFrame>
    )
  }

  if (error) {
    return (
      <PageFrame>
        {header}
        <ErrorState title="We couldn't load trending games" description={error} onRetry={reload} />
      </PageFrame>
    )
  }

  if (games.length === 0) {
    return (
      <PageFrame>
        {header}
        <EmptyState
          icon={<Flame className="h-8 w-8" strokeWidth={1.5} />}
          title="Today's list isn't ready yet"
          description="Trending refreshes once a day. Check back tomorrow."
        />
      </PageFrame>
    )
  }

  const [top, rest] = [games.slice(0, 3), games.slice(3)]
  return (
    <PageFrame>
      {header}

      <ol aria-label="Top 3" className="flex flex-wrap gap-6">
        {top.map((g, i) => (
          <li key={g.rawg_id ?? g.slug ?? g.name} className="min-w-0 flex-[1_1_300px]">
            <article aria-label={`${i + 1}. ${g.name}`} className="app-tile flex flex-col gap-3">
              <Art
                game={g}
                name={g.name}
                initial={false}
                position="50% 35%"
                className="app-frame flex aspect-[16/10] items-end rounded-[var(--app-r-art)]"
              >
                <ArtScrim strength={0.75} />
                <span
                  aria-hidden
                  className="app-num relative px-5 pb-2 text-[72px] font-medium leading-none tracking-[-0.04em] text-[#F5F7F8]"
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                {owned.has(loose(g.name)) && (
                  <span className="absolute right-3 top-3">
                    <ArtChip>In your library</ArtChip>
                  </span>
                )}
              </Art>
              <span className="flex min-w-0 flex-col gap-1">
                <span className="truncate text-[18px] font-semibold text-[var(--app-fg-strong)]">
                  {g.name}
                </span>
                <Meta game={g} />
              </span>
            </article>
          </li>
        ))}
      </ol>

      {rest.length > 0 && (
        <Panel aria-label="More trending games" className="mt-6 py-2 sm:py-3">
          <ol start={4}>
            {rest.map((g, i) => (
              <li
                key={g.rawg_id ?? g.slug ?? g.name}
                className="grid grid-cols-[40px_80px_minmax(0,1fr)_auto] items-center gap-4 border-t border-[var(--app-hairline)] py-3 first:border-t-0"
              >
                <span className="app-num text-right text-[24px] font-medium text-[var(--app-fg-muted)]">
                  {i + 4}
                </span>
                <Art game={g} name={g.name} className="aspect-[16/10] w-20 rounded-[4px]" />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate text-[15px] font-semibold text-[var(--app-fg-strong)]">
                    {g.name}
                  </span>
                  <Meta game={g} />
                </span>
                {owned.has(loose(g.name)) ? (
                  <span className="app-wt-small text-[13px] text-[var(--app-fg-muted)]">
                    In your library
                  </span>
                ) : (
                  <span />
                )}
              </li>
            ))}
          </ol>
        </Panel>
      )}

      <p className="app-wt-small mt-12 text-[13px] text-[var(--app-fg-muted)]">
        {data?.trending_source === 'rawg' ? (
          <>
            Steam&apos;s chart is unavailable, so this shows recent releases players are adding on{' '}
            <a
              href="https://rawg.io"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-[3px] hover:text-[var(--app-fg)]"
            >
              RAWG
            </a>
            .
          </>
        ) : (
          <>Ranked by today&apos;s peak players on Steam. Updated every 6 hours. Not sponsored.</>
        )}
        {data?.trending_updated_at && <> Last updated {ago(data.trending_updated_at)}.</>}
      </p>
    </PageFrame>
  )
}

function Meta({ game }) {
  const parts = []
  if (game.peak_players) parts.push(`${compact(game.peak_players)} playing at peak today`)
  parts.push((game.genres || []).slice(0, 2).join(' · '))
  if (game.metacritic != null) parts.push(`MC ${game.metacritic}`)
  return (
    <span className="app-wt-small flex min-w-0 items-center gap-1.5 text-[14px] text-[var(--app-fg-muted)]">
      <Movement game={game} />
      <span className="truncate">{parts.filter(Boolean).join(' · ')}</span>
    </span>
  )
}

/** Change since last week's chart. Shape + word, never colour alone. */
function Movement({ game }) {
  if (!game.chart_rank) return null
  const last = game.last_week_rank
  if (!last) return <span className="font-semibold text-[var(--app-fg)]">New</span>
  const diff = last - game.chart_rank
  if (diff === 0) return null
  return (
    <span
      className="app-num font-semibold text-[var(--app-fg)]"
      aria-label={diff > 0 ? `Up ${diff} since last week` : `Down ${-diff} since last week`}
    >
      {diff > 0 ? `↑${diff}` : `↓${-diff}`}
    </span>
  )
}

function compact(n) {
  return new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(
    n
  )
}

function ago(iso) {
  const sec = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (sec < 3600) return `${Math.max(1, Math.round(sec / 60))} min ago`
  if (sec < 86400) return `${Math.round(sec / 3600)} h ago`
  return `${Math.round(sec / 86400)} d ago`
}
