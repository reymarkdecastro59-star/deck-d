import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ArrowRight, Compass, Gamepad2, ListChecks, Search } from 'lucide-react'
import { cn } from '@/app/ui/cn'
import { useFocusTrap } from '@/app/hooks/useFocusTrap'
import { useSearchIndex } from './useSearchIndex'

const KIND_ICONS = {
  page: Compass,
  game: Gamepad2,
  session: ListChecks,
}

export function GlobalSearch({ open, onClose }) {
  const inputRef = useRef(null)
  const panelRef = useRef(null)
  const listRef = useRef(null)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const reduce = useReducedMotion()
  const navigate = useNavigate()
  const { search, loading, error } = useSearchIndex(open)

  useFocusTrap(panelRef, open)

  const results = useMemo(() => search(query), [search, query])

  const setQueryAndReset = useCallback((next) => {
    // Reset selected inline with the query change instead of via a follow-up
    // effect — avoids the setState-in-effect cascade and keeps behaviour
    // identical: first arrow-down after typing lands on the top match.
    setQuery(next)
    setSelected(0)
  }, [])

  const close = useCallback(() => {
    setQuery('')
    setSelected(0)
    onClose?.()
  }, [onClose])

  const activate = useCallback(
    (entry) => {
      if (!entry) return
      close()
      navigate(entry.link)
    },
    [close, navigate]
  )

  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => inputRef.current?.focus(), 30)
    const onKey = (e) => {
      if (e.key === 'Escape') {
        close()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelected((i) => Math.min(results.length - 1, i + 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelected((i) => Math.max(0, i - 1))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        activate(results[selected])
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(t)
      window.removeEventListener('keydown', onKey)
    }
  }, [open, close, results, selected, activate])

  // Auto-scroll selected row into view when navigating with arrows.
  useEffect(() => {
    if (!open) return
    const node = listRef.current?.querySelector(`[data-idx="${selected}"]`)
    if (node) node.scrollIntoView({ block: 'nearest' })
  }, [selected, open])

  const scrimTransition = { duration: reduce ? 0 : 0.18 }
  const panelTransition = { duration: reduce ? 0 : 0.22, ease: [0.2, 0.7, 0.2, 1] }
  const panelInitial = reduce ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.98 }
  const panelAnimate = reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }
  const panelExit = reduce ? { opacity: 0 } : { opacity: 0, y: -4, scale: 0.98 }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 flex items-start justify-center px-4 pt-[15vh]"
          style={{ zIndex: 'var(--app-z-dialog)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={scrimTransition}
        >
          <div
            className="absolute inset-0 bg-[var(--app-scrim)] backdrop-blur-sm"
            onClick={close}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Global search"
            className="relative w-full max-w-[560px] overflow-hidden rounded-[var(--app-r-3)] border border-[var(--app-border-strong)] bg-[var(--app-bg-raised)]"
            style={{ boxShadow: 'var(--app-elev-pop)' }}
            initial={panelInitial}
            animate={panelAnimate}
            exit={panelExit}
            transition={panelTransition}
          >
            <div className="flex h-12 items-center gap-3 border-b border-[var(--app-border)] px-4">
              <Search className="h-4 w-4 text-[var(--app-fg-muted)]" strokeWidth={1.75} />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQueryAndReset(e.target.value)}
                placeholder="Search games, sessions, pages…"
                className="flex-1 bg-transparent text-[14px] text-[var(--app-fg)] outline-none placeholder:text-[var(--app-fg-dim)]"
              />
              <kbd className="app-num rounded border border-[var(--app-border)] bg-[var(--app-bg-3)] px-1.5 py-0.5 text-[11px] text-[var(--app-fg-muted)]">
                esc
              </kbd>
            </div>

            <div ref={listRef} className="max-h-[420px] overflow-y-auto py-1">
              {loading && (
                <div className="px-4 py-8 text-center text-[13px] text-[var(--app-fg-muted)]">
                  Loading index…
                </div>
              )}
              {error && (
                <div className="px-4 py-8 text-center text-[13px] text-[var(--app-danger)]">
                  {error}
                </div>
              )}
              {!loading && !error && results.length === 0 && (
                <div className="px-4 py-10 text-center text-[13px] text-[var(--app-fg-muted)]">
                  {query
                    ? 'No matches. Try a game title or a page name.'
                    : 'Type to search across your library, sessions, and app pages.'}
                </div>
              )}
              {!loading &&
                !error &&
                results.map((r, i) => {
                  const Icon = KIND_ICONS[r.kind] ?? Search
                  const active = i === selected
                  return (
                    <button
                      key={r.id}
                      type="button"
                      data-idx={i}
                      onMouseEnter={() => setSelected(i)}
                      onClick={() => activate(r)}
                      className={cn(
                        'flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors',
                        active ? 'bg-[var(--app-bg-3)]' : 'hover:bg-[var(--app-bg-3)]/50'
                      )}
                    >
                      <Icon
                        className={cn(
                          'h-4 w-4 shrink-0',
                          active ? 'text-[var(--app-fg)]' : 'text-[var(--app-fg-muted)]'
                        )}
                        strokeWidth={1.75}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px] text-[var(--app-fg)]">{r.title}</p>
                        {r.hint && (
                          <p className="app-num truncate text-[11.5px] text-[var(--app-fg-dim)]">
                            {r.hint}
                          </p>
                        )}
                      </div>
                      {active && (
                        <ArrowRight
                          className="h-3.5 w-3.5 shrink-0 text-[var(--app-fg-muted)]"
                          strokeWidth={1.75}
                        />
                      )}
                    </button>
                  )
                })}
            </div>

            <div className="flex items-center justify-between border-t border-[var(--app-border)] bg-[var(--app-bg-2)] px-4 py-2 text-[11px] text-[var(--app-fg-dim)]">
              <span>
                <kbd className="app-num rounded border border-[var(--app-border)] px-1 py-0.5">
                  ↑↓
                </kbd>{' '}
                navigate
              </span>
              <span>
                <kbd className="app-num rounded border border-[var(--app-border)] px-1 py-0.5">
                  ⏎
                </kbd>{' '}
                open
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
