import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { AlertCircle, Bell, Check, Inbox } from 'lucide-react'
import { cn } from '@/app/ui/cn'
import { relativeTime } from '@/lib/format'
import { useNotifications } from './useNotifications'

export function NotificationsMenu() {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const navigate = useNavigate()
  const reduce = useReducedMotion()
  const { items, unreadCount, loading, error, markRead, markAllRead } = useNotifications()

  useEffect(() => {
    if (!open) return
    const onClick = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('mousedown', onClick)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onClick)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const handleItemClick = (n) => {
    markRead(n.id)
    setOpen(false)
    if (n.link) navigate(n.link)
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="notifications-panel"
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'relative flex h-9 w-9 items-center justify-center rounded-[var(--app-r-2)]',
          'text-[var(--app-fg-muted)] transition-colors [transition-duration:var(--app-dur-1)]',
          'hover:bg-[var(--app-bg-3)] hover:text-[var(--app-fg)]',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-accent)]'
        )}
      >
        <Bell className="h-4 w-4" strokeWidth={1.75} />
        {unreadCount > 0 && (
          <span
            aria-hidden
            className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[var(--app-accent)]"
          />
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            id="notifications-panel"
            role="menu"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
            transition={{ duration: reduce ? 0 : 0.14, ease: [0.2, 0.7, 0.2, 1] }}
            className="absolute right-0 top-[calc(100%+6px)] w-[340px] overflow-hidden rounded-[var(--app-r-3)] border border-[var(--app-border-strong)] bg-[var(--app-bg-raised)]"
            style={{ boxShadow: 'var(--app-elev-pop)', zIndex: 'var(--app-z-tooltip)' }}
          >
            <div className="flex items-center justify-between border-b border-[var(--app-border)] px-4 py-3">
              <div>
                <p className="text-[11px] uppercase tracking-[var(--app-ls-eyebrow)] text-[var(--app-fg-dim)]">
                  Notifications
                </p>
                <p className="mt-0.5 text-[12.5px] text-[var(--app-fg-muted)]">
                  {unreadCount > 0
                    ? `${unreadCount} unread`
                    : items.length > 0
                      ? 'All caught up'
                      : 'Nothing yet'}
                </p>
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="flex items-center gap-1 text-[12px] text-[var(--app-fg-muted)] transition-colors hover:text-[var(--app-fg)]"
                >
                  <Check className="h-3 w-3" strokeWidth={2} />
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-[360px] overflow-y-auto">
              {loading && (
                <div className="px-4 py-8 text-center text-[12.5px] text-[var(--app-fg-muted)]">
                  Checking…
                </div>
              )}
              {error && (
                <div className="px-4 py-8 text-center text-[12.5px] text-[var(--app-danger)]">
                  Couldn't load notifications
                </div>
              )}
              {!loading && !error && items.length === 0 && (
                <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                  <Inbox className="h-6 w-6 text-[var(--app-fg-dim)]" strokeWidth={1.5} />
                  <p className="text-[13px] text-[var(--app-fg-muted)]">You're all caught up.</p>
                  <p className="text-[12px] text-[var(--app-fg-dim)]">
                    Device changes, milestones, and streak alerts show up here.
                  </p>
                </div>
              )}
              {!loading &&
                !error &&
                items.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    role="menuitem"
                    onClick={() => handleItemClick(n)}
                    className={cn(
                      'flex w-full items-start gap-3 border-b border-[var(--app-hairline)] px-4 py-3 text-left',
                      'transition-colors [transition-duration:var(--app-dur-1)] hover:bg-[var(--app-bg-3)]',
                      !n.read && 'bg-[var(--app-bg-3)]/50'
                    )}
                  >
                    <span className="mt-1 shrink-0">
                      {n.severity === 'warn' ? (
                        <AlertCircle
                          className="h-3.5 w-3.5 text-[var(--app-warn)]"
                          strokeWidth={2}
                        />
                      ) : (
                        <span
                          className={cn(
                            'block h-1.5 w-1.5 rounded-full',
                            n.read ? 'bg-[var(--app-fg-dim)]' : 'bg-[var(--app-accent)]'
                          )}
                        />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-[var(--app-fg)]">
                        {n.title}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-[12px] text-[var(--app-fg-muted)]">
                        {n.body}
                      </p>
                      <p className="app-num mt-1 text-[11px] text-[var(--app-fg-dim)]">
                        {relativeTime(n.ts)}
                      </p>
                    </div>
                  </button>
                ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
