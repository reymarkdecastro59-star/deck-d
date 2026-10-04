import { useMemo, useState } from 'react'
import { ListChecks, RefreshCw, Search, X } from 'lucide-react'
import { Chip } from '@/app/ui/Chip'
import { EmptyState } from '@/app/ui/EmptyState'
import { ErrorState } from '@/app/ui/ErrorState'
import { IconButton } from '@/app/ui/IconButton'
import { Input } from '@/app/ui/Input'
import { SegmentedControl } from '@/app/ui/SegmentedControl'
import { Skeleton } from '@/app/ui/Skeleton'
import { useToast } from '@/app/hooks/useToast'
import { useSessions } from './useSessions'
import { LABELS, LABEL_VALUES, labelTitle } from './labels'
import { SessionItem } from './SessionItem'

const SORTS = [
  { value: 'newest', label: 'Newest' },
  { value: 'longest', label: 'Longest' },
  { value: 'shortest', label: 'Shortest' },
]

const FILTERS = [{ value: 'all', title: 'All' }, ...LABELS]
const EMPTY_ROWS = []
const MS_PER_DAY = 86_400_000

/**
 * Sessions view — chronological history. When sorted newest-first, the
 * list groups by date (Today / Yesterday / weekday / older). Any other
 * sort collapses to a single flat list because grouping by date on
 * length-sorted data isn't useful. Filters and search live in a compact
 * toolbar above the list; active constraints show as chips underneath so
 * the user always sees why the visible set is smaller than the total.
 */
export default function Sessions() {
  const { sessions, loading, error, reload, patchLabel, deleteSession } = useSessions()
  const [query, setQuery] = useState('')
  const [labelFilter, setLabelFilter] = useState('all')
  const [sort, setSort] = useState('newest')
  const { toast, showToast } = useToast()

  const rows = sessions.length ? sessions : EMPTY_ROWS

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = rows.filter((s) => {
      if (labelFilter !== 'all') {
        const lbl = s.label || 'tracked'
        if (labelFilter === 'other') {
          if (LABEL_VALUES.includes(lbl)) return false
        } else if (lbl !== labelFilter) {
          return false
        }
      }
      if (q && !(s.game_name || '').toLowerCase().includes(q)) return false
      return true
    })
    const sorted = [...list]
    if (sort === 'longest') sorted.sort((a, b) => b.duration_sec - a.duration_sec)
    else if (sort === 'shortest') sorted.sort((a, b) => a.duration_sec - b.duration_sec)
    else sorted.sort((a, b) => b.started_at - a.started_at)
    return sorted
  }, [rows, query, labelFilter, sort])

  const grouped = useMemo(() => (sort === 'newest' ? groupByDay(filtered) : null), [filtered, sort])

  const hasQuery = query.trim().length > 0
  const hasLabelFilter = labelFilter !== 'all'
  const hasFilters = hasQuery || hasLabelFilter
  const hasSessions = sessions.length > 0

  return (
    <div
      className="mx-auto w-full px-6 py-8 lg:px-10"
      style={{ maxWidth: 'var(--app-content-max)' }}
    >
      <Toolbar
        count={sessions.length}
        loading={loading}
        query={query}
        onQueryChange={setQuery}
        sort={sort}
        onSortChange={setSort}
        onReload={reload}
        showControls={hasSessions && !loading && !error}
      />

      {hasSessions && !loading && !error && (
        <div className="mt-5 flex flex-wrap items-center gap-2">
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
      )}

      {hasFilters && !loading && !error && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="app-eyebrow text-[10px] text-[var(--app-fg-dim)]">Showing</span>
          <span className="app-num text-[11.5px] text-[var(--app-fg-dim)]">
            {filtered.length.toLocaleString()} of {sessions.length.toLocaleString()}
          </span>
          {hasQuery && <AppliedChip label={`“${query}”`} onClear={() => setQuery('')} />}
          {hasLabelFilter && (
            <AppliedChip label={labelTitle(labelFilter)} onClear={() => setLabelFilter('all')} />
          )}
        </div>
      )}

      <div className="mt-6">
        {loading && <SessionsSkeleton />}

        {error && (
          <ErrorState title="We couldn't load your sessions" description={error} onRetry={reload} />
        )}

        {!loading && !error && !hasSessions && (
          <EmptyState
            icon={<ListChecks className="h-8 w-8" strokeWidth={1.5} />}
            title="Nothing tracked yet"
            description="Sessions appear here as the tracker records them."
          />
        )}

        {!loading && !error && hasSessions && filtered.length === 0 && (
          <EmptyState
            icon={<Search className="h-8 w-8" strokeWidth={1.5} />}
            title="No sessions match"
            description={
              hasQuery
                ? `Nothing matches “${query}”${hasLabelFilter ? ` in ${labelTitle(labelFilter)}` : ''}.`
                : `No sessions labelled ${labelTitle(labelFilter)}.`
            }
          />
        )}

        {!loading &&
          !error &&
          filtered.length > 0 &&
          (grouped ? (
            <div className="space-y-8">
              {grouped.map((g) => (
                <SessionGroup
                  key={g.key}
                  header={g.header}
                  aside={g.aside}
                  sessions={g.rows}
                  onPatch={patchLabel}
                  onDelete={deleteSession}
                  onError={showToast}
                />
              ))}
            </div>
          ) : (
            <SessionGroup
              header={sort === 'longest' ? 'Longest first' : 'Shortest first'}
              sessions={filtered}
              onPatch={patchLabel}
              onDelete={deleteSession}
              onError={showToast}
            />
          ))}
      </div>

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

function Toolbar({
  count,
  loading,
  query,
  onQueryChange,
  sort,
  onSortChange,
  onReload,
  showControls,
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
      <div className="flex items-baseline gap-3">
        <h1
          className="font-normal tracking-tight text-[var(--app-fg-strong)]"
          style={{ fontSize: 'clamp(20px, 1.8vw, 26px)' }}
        >
          Sessions
        </h1>
        <span className="app-num text-[13px] text-[var(--app-fg-dim)]">
          {loading ? '' : count.toLocaleString()}
        </span>
      </div>
      {showControls && (
        <div className="flex flex-1 flex-wrap items-center justify-end gap-3">
          <div className="min-w-[220px] max-w-[360px] flex-1">
            <Input
              size="sm"
              leadingIcon={<Search />}
              placeholder="Search titles…"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
            />
          </div>
          <SegmentedControl items={SORTS} value={sort} onChange={onSortChange} size="sm" />
          <IconButton size="sm" label="Reload sessions" onClick={onReload}>
            <RefreshCw />
          </IconButton>
        </div>
      )}
    </div>
  )
}

function SessionGroup({ header, aside, sessions, onPatch, onDelete, onError }) {
  return (
    <section>
      <div className="flex items-baseline justify-between border-b border-[var(--app-hairline)] pb-2">
        <h2 className="app-eyebrow text-[10.5px] text-[var(--app-fg-muted)]">{header}</h2>
        {aside && <span className="app-num text-[11px] text-[var(--app-fg-dim)]">{aside}</span>}
      </div>
      <ul className="mt-1">
        {sessions.map((s) => (
          <SessionItem
            key={s.session_id}
            session={s}
            onPatch={onPatch}
            onDelete={onDelete}
            onError={onError}
          />
        ))}
      </ul>
    </section>
  )
}

function AppliedChip({ label, onClear }) {
  return (
    <button
      type="button"
      onClick={onClear}
      className="inline-flex items-center gap-1.5 rounded-[var(--app-r-pill)] border border-[var(--app-border)] bg-[var(--app-bg-2)] py-1 pl-2.5 pr-1.5 text-[12px] text-[var(--app-fg)] transition-colors [transition-duration:var(--app-dur-1)] hover:border-[var(--app-border-strong)]"
    >
      <span className="max-w-[200px] truncate">{label}</span>
      <X className="h-3 w-3 text-[var(--app-fg-muted)]" strokeWidth={2} />
    </button>
  )
}

/**
 * Group sessions by day using local time. Buckets:
 *   Today · Yesterday · <weekday> (within last 6 days) · <Mon Day> · <Mon Day, Year>
 */
function groupByDay(sessions) {
  if (!sessions.length) return []
  const groups = new Map()
  const today = startOfDay(new Date())

  for (const s of sessions) {
    const d = startOfDay(new Date(s.started_at * 1000))
    const key = d.getTime()
    if (!groups.has(key)) groups.set(key, { key, date: d, rows: [], hours: 0 })
    const g = groups.get(key)
    g.rows.push(s)
    g.hours += (s.duration_sec || 0) / 3600
  }

  const arr = [...groups.values()].sort((a, b) => b.date - a.date)
  return arr.map((g) => {
    const deltaDays = Math.round((today - g.date) / MS_PER_DAY)
    let header
    if (deltaDays === 0) header = 'Today'
    else if (deltaDays === 1) header = 'Yesterday'
    else if (deltaDays < 7) header = g.date.toLocaleDateString(undefined, { weekday: 'long' })
    else if (g.date.getFullYear() === today.getFullYear())
      header = g.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    else
      header = g.date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    const aside = `${g.rows.length} · ${g.hours >= 1 ? `${g.hours.toFixed(1)}h` : `${Math.round(g.hours * 60)}m`}`
    return { ...g, header, aside }
  })
}

function startOfDay(d) {
  const c = new Date(d)
  c.setHours(0, 0, 0, 0)
  return c
}

function SessionsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3.5 py-2">
          <Skeleton className="h-1.5 w-1.5 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-1/2" />
            <Skeleton className="h-2.5 w-1/3" />
          </div>
          <Skeleton className="h-3.5 w-14" />
        </div>
      ))}
    </div>
  )
}
