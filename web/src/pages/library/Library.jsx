import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Download, Gamepad2, Search, X } from 'lucide-react'
import { Button } from '@/app/ui/Button'
import { EmptyState } from '@/app/ui/EmptyState'
import { ErrorState } from '@/app/ui/ErrorState'
import { Input } from '@/app/ui/Input'
import { PageFrame, PageHeader } from '@/app/ui/PageHeader'
import { SegmentedControl } from '@/app/ui/SegmentedControl'
import { Skeleton } from '@/app/ui/Skeleton'
import { useLibrary } from './useLibrary'
import { GameTile } from './GameTile'

const SORTS = [
  { value: 'momentum', label: 'Momentum' },
  { value: 'hours', label: 'Hours' },
  { value: 'title', label: 'Title' },
]

const EMPTY_GAMES = []

/**
 * Library (UX v2 §5.3): page title, then one toolbar row, then the cover
 * grid — covers are the dominant visual. Search filters, sort reorders; an
 * applied-filter chip always shows what's constraining the visible set.
 */
export default function Library() {
  const { summary, loading, error, reload } = useLibrary()
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('momentum')

  const games = summary?.games ?? EMPTY_GAMES

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = q ? games.filter((g) => (g.game || '').toLowerCase().includes(q)) : games
    const sorted = [...list]
    if (sort === 'hours') sorted.sort((a, b) => b.total_hours - a.total_hours)
    else if (sort === 'title') sorted.sort((a, b) => (a.game || '').localeCompare(b.game || ''))
    else sorted.sort((a, b) => b.decay_hours - a.decay_hours)
    return sorted
  }, [games, query, sort])

  const hasGames = games.length > 0
  const hasQuery = query.trim().length > 0

  return (
    <PageFrame>
      <Toolbar
        gameCount={games.length}
        loading={loading}
        query={query}
        onQueryChange={setQuery}
        sort={sort}
        onSortChange={setSort}
        showControls={hasGames && !loading && !error}
      />

      {hasQuery && (
        <div className="-mt-2 mb-6 flex flex-wrap items-center gap-2.5 text-[14px]">
          <span className="app-wt-small text-[var(--app-fg-muted)]">Filtered by</span>
          <AppliedChip label={`“${query}”`} onClear={() => setQuery('')} />
          <span className="app-num app-wt-small text-[var(--app-fg-muted)]">
            {filtered.length.toLocaleString()} of {games.length.toLocaleString()}
          </span>
        </div>
      )}

      <div>
        {loading && <LibrarySkeleton />}

        {error && (
          <ErrorState title="We couldn't load your library" description={error} onRetry={reload} />
        )}

        {!loading && !error && !hasGames && (
          <EmptyState
            icon={<Gamepad2 className="h-8 w-8" strokeWidth={1.5} />}
            title="Your library is empty"
            description="Games show up here after the tracker records a session. Nothing is imported without your say-so."
            action={
              <Button
                as={Link}
                to="/devices"
                variant="primary"
                leadingIcon={<Download className="h-4 w-4" />}
              >
                Install tracker
              </Button>
            }
          />
        )}

        {!loading && !error && hasGames && filtered.length === 0 && (
          <EmptyState
            icon={<Search className="h-8 w-8" strokeWidth={1.5} />}
            title="No matches"
            description={`Nothing in your library matches “${query}”.`}
            action={
              <Button variant="secondary" onClick={() => setQuery('')}>
                Clear filter
              </Button>
            }
          />
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className={GRID}>
            {filtered.map((g) => (
              <GameTile key={g.rawg_id ?? g.slug ?? g.game} game={g} />
            ))}
          </div>
        )}
      </div>
    </PageFrame>
  )
}

// ≥180px covers on desktop (UX v2 R2); two columns on phone.
const GRID =
  'grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-[repeat(auto-fill,minmax(180px,1fr))] sm:gap-x-6 sm:gap-y-10'

/**
 * Toolbar row. Left: page label + game count as one typographic unit.
 * Right: search + sort. On mobile the controls wrap under the label.
 */
function Toolbar({ gameCount, loading, query, onQueryChange, sort, onSortChange, showControls }) {
  return (
    <PageHeader
      title="Library"
      count={loading ? null : gameCount}
      countLabel={gameCount === 1 ? 'game' : 'games'}
      lede={loading ? null : 'Everything the tracker has recorded, across every launcher.'}
      toolbar={
        showControls && (
          <>
            <div className="min-w-[220px] max-w-[400px] flex-1">
              <Input
                leadingIcon={<Search />}
                placeholder="Search your library"
                aria-label="Search your library"
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
              />
            </div>
            <span className="ml-auto inline-flex items-center gap-2.5">
              <span className="app-wt-small text-[14px] text-[var(--app-fg-muted)]">Sort</span>
              <SegmentedControl items={SORTS} value={sort} onChange={onSortChange} />
            </span>
          </>
        )
      }
    />
  )
}

function AppliedChip({ label, onClear }) {
  return (
    <button
      type="button"
      onClick={onClear}
      aria-label={`Clear filter ${label}`}
      className="inline-flex h-8 items-center gap-1.5 rounded-[var(--app-r-pill)] border border-[var(--app-border)] bg-[var(--app-bg-2)] pl-3 pr-2 text-[14px] text-[var(--app-fg)] transition-colors [transition-duration:var(--app-dur-1)] hover:border-[var(--app-border-strong)]"
    >
      <span className="max-w-[220px] truncate">{label}</span>
      <X className="h-3.5 w-3.5 text-[var(--app-fg-muted)]" strokeWidth={2} />
    </button>
  )
}

function LibrarySkeleton() {
  return (
    <div className={GRID}>
      {Array.from({ length: 14 }).map((_, i) => (
        <div key={i}>
          <Skeleton className="aspect-[3/4] rounded-[var(--app-r-3)]" />
          <Skeleton className="mt-3 h-4 w-4/5" />
          <Skeleton className="mt-2 h-3.5 w-2/5" />
        </div>
      ))}
    </div>
  )
}
