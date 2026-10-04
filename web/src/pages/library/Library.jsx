import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Download, Gamepad2, Search, X } from 'lucide-react'
import { Button } from '@/app/ui/Button'
import { EmptyState } from '@/app/ui/EmptyState'
import { ErrorState } from '@/app/ui/ErrorState'
import { Input } from '@/app/ui/Input'
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
 * Library. The composition is deliberately toolbar + grid, not a big
 * PageHeader block followed by another toolbar. The dominant visual is
 * the game covers themselves. Search is a filter (attribute reduction);
 * sort reorders. When a search is active a small applied-filter chip
 * appears so the user always sees what's constraining the visible set.
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
    <div
      className="mx-auto w-full px-6 py-8 lg:px-10"
      style={{ maxWidth: 'var(--app-content-max)' }}
    >
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
        <div className="mt-4 flex items-center gap-2">
          <span className="app-eyebrow text-[10px] text-[var(--app-fg-dim)]">Filtered by</span>
          <AppliedChip label={`“${query}”`} onClear={() => setQuery('')} />
          <span className="app-num text-[11.5px] text-[var(--app-fg-dim)]">
            {filtered.length.toLocaleString()} of {games.length.toLocaleString()}
          </span>
        </div>
      )}

      <div className="mt-6">
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
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
            {filtered.map((g) => (
              <GameTile key={g.rawg_id ?? g.slug ?? g.game} game={g} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Toolbar row. Left: page label + game count as one typographic unit.
 * Right: search + sort. On mobile the controls wrap under the label.
 */
function Toolbar({ gameCount, loading, query, onQueryChange, sort, onSortChange, showControls }) {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
      <div className="flex items-baseline gap-3">
        <h1
          className="font-normal tracking-tight text-[var(--app-fg-strong)]"
          style={{ fontSize: 'clamp(20px, 1.8vw, 26px)' }}
        >
          Library
        </h1>
        <span className="app-num text-[13px] text-[var(--app-fg-dim)]">
          {loading ? '' : gameCount.toLocaleString()}
        </span>
      </div>
      {showControls && (
        <div className="flex flex-1 flex-wrap items-center justify-end gap-3">
          <div className="min-w-[220px] max-w-[360px] flex-1">
            <Input
              leadingIcon={<Search />}
              placeholder="Search titles…"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              size="sm"
            />
          </div>
          <SegmentedControl items={SORTS} value={sort} onChange={onSortChange} size="sm" />
        </div>
      )}
    </div>
  )
}

function AppliedChip({ label, onClear }) {
  return (
    <button
      type="button"
      onClick={onClear}
      className="inline-flex items-center gap-1.5 rounded-[var(--app-r-pill)] border border-[var(--app-border)] bg-[var(--app-bg-2)] py-1 pl-2.5 pr-1.5 text-[12px] text-[var(--app-fg)] transition-colors [transition-duration:var(--app-dur-1)] hover:border-[var(--app-border-strong)]"
    >
      <span className="max-w-[220px] truncate">{label}</span>
      <X className="h-3 w-3 text-[var(--app-fg-muted)]" strokeWidth={2} />
    </button>
  )
}

function LibrarySkeleton() {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
      {Array.from({ length: 14 }).map((_, i) => (
        <div key={i}>
          <Skeleton className="aspect-[3/4] rounded-[var(--app-r-2)]" />
          <Skeleton className="mt-3 h-3 w-4/5" />
          <Skeleton className="mt-2 h-2.5 w-2/5" />
        </div>
      ))}
    </div>
  )
}
