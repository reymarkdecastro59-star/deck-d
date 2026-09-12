import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Download, Gamepad2, Search } from 'lucide-react'
import { Button } from '@/app/ui/Button'
import { EmptyState } from '@/app/ui/EmptyState'
import { ErrorState } from '@/app/ui/ErrorState'
import { Input } from '@/app/ui/Input'
import { PageHeader } from '@/app/ui/PageHeader'
import { SegmentedControl } from '@/app/ui/SegmentedControl'
import { Skeleton } from '@/app/ui/Skeleton'
import { useLibrary } from './useLibrary'
import { GameCard } from './GameCard'

const SORTS = [
  { value: 'momentum', label: 'Momentum' },
  { value: 'hours', label: 'Total hours' },
  { value: 'title', label: 'Title' },
]

// Stable reference so useMemo below doesn't re-run every render when summary is null.
const EMPTY_GAMES = []

export default function Library() {
  const { summary, loading, error, reload } = useLibrary()
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('momentum')

  const games = summary?.games ?? EMPTY_GAMES

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = q ? games.filter((g) => g.game.toLowerCase().includes(q)) : games
    const sorted = [...list]
    if (sort === 'hours') sorted.sort((a, b) => b.total_hours - a.total_hours)
    else if (sort === 'title') sorted.sort((a, b) => a.game.localeCompare(b.game))
    else sorted.sort((a, b) => b.decay_hours - a.decay_hours)
    return sorted
  }, [games, query, sort])

  return (
    <div className="mx-auto max-w-[1280px] space-y-6 px-8 py-8">
      <PageHeader
        eyebrow="Library"
        title="Your games"
        lede={
          loading
            ? 'Loading…'
            : games.length === 0
              ? 'No games yet — install the tracker or log a session to populate this list.'
              : `${games.length.toLocaleString()} game${games.length === 1 ? '' : 's'} tracked, sorted by momentum.`
        }
      />

      {!loading && !error && games.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-[240px] max-w-[420px] flex-1">
            <Input
              leadingIcon={<Search />}
              placeholder="Filter by title…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <SegmentedControl items={SORTS} value={sort} onChange={setSort} size="sm" />
        </div>
      )}

      {loading && <LibrarySkeleton />}

      {error && (
        <ErrorState title="We couldn't load your library" description={error} onRetry={reload} />
      )}

      {!loading && !error && games.length === 0 && (
        <EmptyState
          icon={<Gamepad2 className="h-8 w-8" strokeWidth={1.5} />}
          title="Your library is empty"
          description="Games show up here after the tracker records a session, or after you log one manually. Nothing is imported without your say-so."
          action={
            <div className="flex items-center gap-2">
              <Button
                as={Link}
                to="/devices"
                variant="primary"
                leadingIcon={<Download className="h-4 w-4" />}
              >
                Install tracker
              </Button>
              <Button as={Link} to="/sessions" variant="quiet">
                Log a session
              </Button>
            </div>
          }
        />
      )}

      {!loading && !error && games.length > 0 && filtered.length === 0 && (
        <EmptyState
          icon={<Search className="h-8 w-8" strokeWidth={1.5} />}
          title="No matches"
          description={`Nothing in your library matches “${query}”. Try a different filter.`}
        />
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((g) => (
            <GameCard key={g.rawg_id ?? g.slug ?? g.game} game={g} />
          ))}
        </div>
      )}
    </div>
  )
}

function LibrarySkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-[var(--app-r-3)] border border-[var(--app-border)] bg-[var(--app-bg-2)]"
        >
          <Skeleton className="aspect-[16/9] rounded-none" />
          <div className="space-y-2 p-4">
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-2.5 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}
