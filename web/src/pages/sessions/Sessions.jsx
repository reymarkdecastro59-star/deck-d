import { useMemo, useState } from 'react'
import { ListChecks, RefreshCw, Search, X } from 'lucide-react'
import { Chip } from '@/app/ui/Chip'
import { EmptyState } from '@/app/ui/EmptyState'
import { ErrorState } from '@/app/ui/ErrorState'
import { IconButton } from '@/app/ui/IconButton'
import { Input } from '@/app/ui/Input'
import { PageFrame, PageHeader } from '@/app/ui/PageHeader'
import { Panel, PanelHead } from '@/app/ui/Panel'
import { WeekTimeline } from '@/app/viz'
import { formatDuration } from '@/lib/format'
import { lastSevenDays } from '@/lib/week'
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
 * Sessions (UX v2 §5.5): title → the last 7 days as a picture → the history.
 * Newest-first groups by day, each day a panel (common region) with a total;
 * other sorts are one flat list. Active filters show as chips so the user
 * always sees why the visible set is smaller than the total.
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
  const recentDays = useMemo(() => lastSevenDays(rows), [rows])

  const hasQuery = query.trim().length > 0
  const hasLabelFilter = labelFilter !== 'all'
  const hasFilters = hasQuery || hasLabelFilter
  const hasSessions = sessions.length > 0

  return (
    <PageFrame>
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
        <Panel aria-labelledby="ss-week" className="mb-8">
          <PanelHead
            id="ss-week"
            title="Last 7 days"
            description="Each block is a session, in the game's colour"
          />
          <WeekTimeline days={recentDays} />
        </Panel>
      )}

      {hasSessions && !loading && !error && (
        <div
          role="group"
          aria-label="Filter by label"
          className="flex flex-wrap items-center gap-2"
        >
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
        <div className="mt-4 flex flex-wrap items-center gap-2.5 text-[14px]">
          <span className="app-wt-small text-[var(--app-fg-muted)]">
            Showing{' '}
            <span className="app-num text-[var(--app-fg)]">
              {filtered.length.toLocaleString()} of {sessions.length.toLocaleString()}
            </span>
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
            <div className="space-y-6">
              {grouped.map((g) => (
                <SessionGroup
                  key={g.key}
                  header={g.header}
                  aside={g.aside}
                  sessions={g.rows}
                  timeOnly
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
          className="fixed bottom-6 right-6 z-50 max-w-[380px] rounded-[var(--app-r-3)] border border-[var(--app-danger)] bg-[var(--app-danger-tint)] px-4 py-3 text-[14px] text-[var(--app-fg)]"
        >
          {toast}
        </div>
      )}
    </PageFrame>
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
    <PageHeader
      title="Sessions"
      count={loading ? null : count}
      countLabel={count === 1 ? 'session' : 'sessions'}
      lede={loading ? null : 'Every game the tracker recorded, newest first.'}
      actions={
        showControls && (
          <IconButton label="Reload sessions" onClick={onReload}>
            <RefreshCw />
          </IconButton>
        )
      }
      toolbar={
        showControls && (
          <>
            <div className="min-w-[220px] max-w-[400px] flex-1">
              <Input
                leadingIcon={<Search />}
                placeholder="Search by game"
                aria-label="Search sessions by game"
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

function SessionGroup({ header, aside, sessions, onPatch, onDelete, onError, timeOnly }) {
  return (
    <Panel as="section" aria-label={header} className="py-2 sm:py-3">
      <div className="flex items-baseline justify-between gap-4 border-b border-[var(--app-hairline)] pb-3 pt-2">
        <h2 className="text-[17px] font-semibold text-[var(--app-fg-strong)]">{header}</h2>
        {aside && (
          <span className="app-wt-small app-num text-[14px] text-[var(--app-fg-muted)]">
            {aside}
          </span>
        )}
      </div>
      <ul>
        {sessions.map((s) => (
          <SessionItem
            key={s.session_id}
            session={s}
            onPatch={onPatch}
            onDelete={onDelete}
            onError={onError}
            timeOnly={timeOnly}
          />
        ))}
      </ul>
    </Panel>
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
      <span className="max-w-[200px] truncate">{label}</span>
      <X className="h-3.5 w-3.5 text-[var(--app-fg-muted)]" strokeWidth={2} />
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
    const n = g.rows.length
    const aside = `${n} ${n === 1 ? 'session' : 'sessions'} · ${formatDuration(Math.round(g.hours * 3600))}`
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
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3.5 py-2">
          <Skeleton className="h-[43px] w-8 rounded-[3px]" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3.5 w-1/3" />
          </div>
          <Skeleton className="h-4 w-14" />
        </div>
      ))}
    </div>
  )
}
