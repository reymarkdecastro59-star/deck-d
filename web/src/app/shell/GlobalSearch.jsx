import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Search } from 'lucide-react'

export function GlobalSearch({ open, onClose }) {
  const inputRef = useRef(null)
  const [query, setQuery] = useState('')

  const close = useCallback(() => {
    setQuery('')
    onClose?.()
  }, [onClose])

  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => inputRef.current?.focus(), 30)
    const esc = (e) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', esc)
    return () => {
      clearTimeout(t)
      window.removeEventListener('keydown', esc)
    }
  }, [open, close])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 flex items-start justify-center px-4 pt-[15vh]"
          style={{ zIndex: 'var(--app-z-dialog)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <div
            className="absolute inset-0 bg-[var(--app-scrim)] backdrop-blur-sm"
            onClick={close}
          />
          <motion.div
            role="dialog"
            aria-label="Global search"
            className="relative w-full max-w-[560px] overflow-hidden rounded-[var(--app-r-3)] border border-[var(--app-border-strong)] bg-[var(--app-bg-raised)]"
            style={{ boxShadow: 'var(--app-elev-pop)' }}
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.2, 0.7, 0.2, 1] }}
          >
            <div className="flex h-12 items-center gap-3 border-b border-[var(--app-border)] px-4">
              <Search className="h-4 w-4 text-[var(--app-fg-muted)]" strokeWidth={1.75} />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search games, sessions, pages…"
                className="flex-1 bg-transparent text-[14px] text-[var(--app-fg)] outline-none placeholder:text-[var(--app-fg-dim)]"
              />
              <kbd className="app-num rounded border border-[var(--app-border)] bg-[var(--app-bg-3)] px-1.5 py-0.5 text-[11px] text-[var(--app-fg-muted)]">
                esc
              </kbd>
            </div>
            <div className="px-4 py-10 text-center">
              <p className="text-[13px] text-[var(--app-fg-muted)]">
                {query
                  ? 'No matches yet — search index comes online with the library.'
                  : 'Type to search across your library, sessions, and app pages.'}
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
