import { memo, useEffect, useRef, useState } from 'react'
import { MoreHorizontal, Trash2 } from 'lucide-react'
import { Art } from '@/app/ui/Art'
import { Button } from '@/app/ui/Button'
import { IconButton } from '@/app/ui/IconButton'
import { Select } from '@/app/ui/Select'
import { formatDate, formatDuration } from '@/lib/format'
import { LABELS, labelTitle } from './labels'

const SELECT_OPTIONS = LABELS.map((l) => ({ value: l.value, label: l.title }))

/**
 * Session row (UX v2 §5.5): a 32px thumb in the game's identity colour (the
 * same colour as its timeline block), a 15px title, a plain-language time
 * line, then the duration readout. The actions button is always visible
 * (dimmed until hover/focus) so touch users can reach it.
 */
function SessionItemImpl({ session, onPatch, onDelete, onError, timeOnly = false }) {
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const rootRef = useRef(null)
  const timerRef = useRef(null)

  useEffect(() => {
    if (!confirming) return
    timerRef.current = setTimeout(() => setConfirming(false), 3000)
    return () => clearTimeout(timerRef.current)
  }, [confirming])

  useEffect(() => {
    if (!menuOpen) return
    const onClick = (e) => {
      if (!rootRef.current?.contains(e.target)) setMenuOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('mousedown', onClick)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onClick)
      window.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  const changeLabel = async (next) => {
    if (next === session.label) return
    try {
      await onPatch(session.session_id, next)
    } catch (err) {
      onError?.(err.message || 'Failed to update label')
    }
  }

  const handleDelete = async () => {
    if (!confirming) {
      setConfirming(true)
      setMenuOpen(false)
      return
    }
    setBusy(true)
    try {
      await onDelete(session.session_id)
    } catch (err) {
      onError?.(err.message || 'Failed to delete session')
      setBusy(false)
      setConfirming(false)
    }
  }

  return (
    <li
      ref={rootRef}
      className="group relative grid grid-cols-[auto_1fr_auto] items-center gap-x-4 border-t border-[var(--app-hairline)] py-3 first:border-t-0"
    >
      <Art name={session.game_name} className="h-[43px] w-8 shrink-0 rounded-[3px]" />

      <div className="min-w-0">
        <div className="truncate text-[15px] font-semibold text-[var(--app-fg-strong)]">
          {session.game_name}
        </div>
        <div className="app-wt-small mt-0.5 flex flex-wrap items-center gap-x-2 text-[13px] text-[var(--app-fg-muted)]">
          {/* Inside a day group the panel already names the day. */}
          <span>
            {timeOnly
              ? new Date(session.started_at * 1000).toLocaleTimeString(undefined, {
                  hour: 'numeric',
                  minute: '2-digit',
                })
              : formatDate(session.started_at, 'time')}
          </span>
          <span aria-hidden>·</span>
          <span>{labelTitle(session.label)}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="app-num text-[15px] text-[var(--app-fg-strong)]">
          {formatDuration(session.duration_sec)}
        </span>

        {confirming ? (
          <div className="flex items-center gap-1.5">
            <Button size="sm" variant="ghost" onClick={() => setConfirming(false)} disabled={busy}>
              Cancel
            </Button>
            <Button size="sm" variant="danger" onClick={handleDelete} loading={busy}>
              {busy ? '…' : 'Delete'}
            </Button>
          </div>
        ) : (
          <div className="relative">
            <IconButton
              size="sm"
              label="Session actions"
              onClick={() => setMenuOpen((v) => !v)}
              className="opacity-60 transition-opacity [transition-duration:var(--app-dur-1)] group-focus-within:opacity-100 group-hover:opacity-100"
            >
              <MoreHorizontal />
            </IconButton>
            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-[calc(100%+4px)] z-20 w-[220px] overflow-hidden rounded-[var(--app-r-3)] border border-[var(--app-border-strong)] bg-[var(--app-bg-raised)] p-2"
                style={{ boxShadow: 'var(--app-elev-pop)' }}
              >
                <div className="px-2 pb-2 pt-1">
                  <div className="text-[13px] font-medium text-[var(--app-fg-muted)]">Label</div>
                  <div className="mt-1.5">
                    <Select
                      size="sm"
                      options={SELECT_OPTIONS}
                      value={session.label || 'tracked'}
                      onChange={(v) => {
                        changeLabel(v)
                      }}
                      aria-label={`Label for ${session.game_name}`}
                    />
                  </div>
                </div>
                <div className="mt-1 border-t border-[var(--app-hairline)] pt-1">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleDelete}
                    className="flex w-full items-center gap-2 rounded-[var(--app-r-2)] px-2 py-2 text-left text-[14px] text-[var(--app-danger)] transition-colors hover:bg-[var(--app-danger-tint)]"
                  >
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                    Delete session
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </li>
  )
}

export const SessionItem = memo(SessionItemImpl)
