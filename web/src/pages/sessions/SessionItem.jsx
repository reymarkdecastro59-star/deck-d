import { memo, useEffect, useRef, useState } from 'react'
import { MoreHorizontal, Trash2 } from 'lucide-react'
import { Button } from '@/app/ui/Button'
import { IconButton } from '@/app/ui/IconButton'
import { Select } from '@/app/ui/Select'
import { getLabelColor } from '@/app/design/tokens'
import { formatDate, formatDuration } from '@/lib/format'
import { LABELS, labelTitle } from './labels'

const SELECT_OPTIONS = LABELS.map((l) => ({ value: l.value, label: l.title }))

/**
 * Chronological session row. No card, no table — a compact list item that
 * lines up on a grid: label dot, game name + start-time secondary, right-
 * aligned duration, and an actions column that stays hidden until pointer-
 * hover or focus. Touch users get the same actions via the always-visible
 * ellipsis on md-. Label change and delete are the only per-row actions;
 * everything else lives in Session Detail (future).
 */
function SessionItemImpl({ session, onPatch, onDelete, onError }) {
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const rootRef = useRef(null)
  const timerRef = useRef(null)
  const color = getLabelColor(session.label)

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
      className="group relative grid grid-cols-[auto_1fr_auto] items-center gap-x-4 gap-y-1 border-t border-[var(--app-hairline)] py-3 first:border-t-0"
    >
      <span
        aria-hidden
        className="mt-2 h-1.5 w-1.5 shrink-0 self-start rounded-full"
        style={{ background: color }}
      />

      <div className="min-w-0">
        <div className="truncate text-[14px] text-[var(--app-fg)]">{session.game_name}</div>
        <div className="app-num mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11.5px] text-[var(--app-fg-dim)]">
          <span>{formatDate(session.started_at, 'time')}</span>
          <span aria-hidden>·</span>
          <span className="capitalize">{labelTitle(session.label)}</span>
          {session.game_exe && (
            <>
              <span aria-hidden>·</span>
              <span className="truncate">{session.game_exe}</span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="app-num text-[14px] text-[var(--app-fg-strong)]">
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
                  <div className="app-eyebrow text-[10px] text-[var(--app-fg-dim)]">Label</div>
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
                    className="flex w-full items-center gap-2 rounded-[var(--app-r-2)] px-2 py-1.5 text-left text-[13px] text-[var(--app-danger)] transition-colors hover:bg-[var(--app-danger-tint)]"
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
