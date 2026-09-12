import { useMemo, useState } from 'react'
import { ListChecks, RefreshCw, Search } from 'lucide-react'
import { Chip } from '@/app/ui/Chip'
import { EmptyState } from '@/app/ui/EmptyState'
import { ErrorState } from '@/app/ui/ErrorState'
import { IconButton } from '@/app/ui/IconButton'
import { Input } from '@/app/ui/Input'
import { PageHeader } from '@/app/ui/PageHeader'
import { SegmentedControl } from '@/app/ui/SegmentedControl'
import { Skeleton } from '@/app/ui/Skeleton'
import { useToast } from '@/app/hooks/useToast'
import { useSessions } from './useSessions'
import { LABELS, LABEL_VALUES, labelTitle } from './labels'
import { SessionRow } from './SessionRow'

const SORTS = [
  { value: 'newest', label: 'Newest' },
  { value: 'longest', label: 'Longest' },
  { value: 'shortest', label: 'Shortest' },
]

const FILTERS = [{ value: 'all', title: 'All' }, ...LABELS]
const EMPTY_ROWS = []

export default function Sessions() {
  const { sessions, loading, error, reload, patchLabel, deleteSession } = useSessions()
  const [query, setQuery] = useState('')
  const [labelFilter, setLabelFilter] = useState('all')
  const [sort, setSort] = useState('newest')
  const { toast, showToast } = useToast()

  const rows = sessions.length ? sessions : EMPTY_ROWS

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filteredList = rows.filter((s) => {
      if (labelFilter !== 'all') {
        const lbl = s.label || 'tracked'
        // 'other' selects any label not in our canonical set. Not used yet but
        // future-proofs the filter if custom labels appear in the wild.
        if (labelFilter === 'other') {
          if (LABEL_VALUES.includes(lbl)) return false
        } else if (lbl !== labelFilter) {
          return false
        }
      }
      if (q && !(s.game_name || '').toLowerCase().includes(q)) return false
      return true
    })
    const sorted = [...filteredList]
    if (sort === 'longest') sorted.sort((a, b) => b.duration_sec - a.duration_sec)
    else if (sort === 'shortest') sorted.sort((a, b) => a.duration_sec - b.duration_sec)
    else sorted.sort((a, b) => b.started_at - a.started_at)
    return sorted
  }, [rows, query, labelFilter, sort])

  return (
    <div className="mx-auto max-w-[1280px] space-y-6 px-8 py-8">
      <PageHeader
        eyebrow="Sessions"
        title="All sessions"
        lede={
          loading
            ? 'Loading…'
            : sessions.length === 0
              ? 'No sessions yet.'
              : `${sessions.length.toLocaleString()} session${sessions.length === 1 ? '' : 's'} on record.`
        }
        aside={
          !loading &&
          sessions.length > 0 && (
            <IconButton size="sm" label="Reload sessions" onClick={reload}>
              <RefreshCw />
            </IconButton>
          )
        }
      />

      {!loading && !error && sessions.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-[240px] max-w-[420px] flex-1">
              <Input
                leadingIcon={<Search />}
                placeholder="Filter by game title…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <SegmentedControl items={SORTS} value={sort} onChange={setSort} size="sm" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {FILTERS.map((f) => (
              <Chip
                key={f.value}
                as="button"
                variant={f.value === labelFilter ? 'accent' : 'neutral'}
                selected={f.value === labelFilter}
                onClick={() => setLabelFilter(f.value)}
              >
                {f.title}
              </Chip>
            ))}
          </div>
        </div>
      )}

      {loading && <SessionsSkeleton />}

      {error && (
        <ErrorState title="We couldn't load your sessions" description={error} onRetry={reload} />
      )}

      {!loading && !error && sessions.length === 0 && (
        <EmptyState
          icon={<ListChecks className="h-8 w-8" strokeWidth={1.5} />}
          title="Nothing tracked yet"
          description="Sessions appear here as the tracker records them or when you log one manually."
        />
      )}

      {!loading && !error && sessions.length > 0 && filtered.length === 0 && (
        <EmptyState
          icon={<Search className="h-8 w-8" strokeWidth={1.5} />}
          title="No sessions match"
          description={
            query
              ? `Nothing matches “${query}”${labelFilter !== 'all' ? ` in ${labelTitle(labelFilter)}` : ''}.`
              : `No sessions labelled ${labelTitle(labelFilter)}.`
          }
        />
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="overflow-hidden rounded-[var(--app-r-3)] border border-[var(--app-border)] bg-[var(--app-bg-2)]">
          <table className="w-full">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-[0.12em] text-[var(--app-fg-dim)]">
                <th className="px-4 py-3 font-medium">Game</th>
                <th className="px-4 py-3 font-medium">Label</th>
                <th className="px-4 py-3 font-medium">Started</th>
                <th className="px-4 py-3 font-medium">Duration</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <SessionRow
                  key={s.session_id}
                  session={s}
                  onPatch={patchLabel}
                  onDelete={deleteSession}
                  onError={showToast}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {toast && (
        <div
          role="alert"
          className="fixed bottom-6 right-6 z-50 max-w-[380px] rounded-[var(--app-r-3)] border border-[var(--app-danger)] bg-[var(--app-danger-tint)] px-4 py-3 text-[13px] text-[var(--app-fg)]"
        >
          {toast}
        </div>
      )}
    </div>
  )
}

function SessionsSkeleton() {
  return (
    <div className="space-y-3 rounded-[var(--app-r-3)] border border-[var(--app-border)] bg-[var(--app-bg-2)] p-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-8 w-8" />
        </div>
      ))}
    </div>
  )
}
