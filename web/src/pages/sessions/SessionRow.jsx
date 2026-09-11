import { useEffect, useRef, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { IconButton } from '@/app/ui/IconButton'
import { Select } from '@/app/ui/Select'
import { getLabelColor } from '@/app/design/tokens'
import { LABELS, labelTitle } from './labels'

const SELECT_OPTIONS = LABELS.map((l) => ({ value: l.value, label: l.title }))

function formatDate(unix) {
  return new Date(unix * 1000).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function relativeTime(unix) {
  const diff = Date.now() / 1000 - unix
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86_400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604_800) return `${Math.floor(diff / 86_400)}d ago`
  return new Date(unix * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export function SessionRow({ session, onPatch, onDelete, onError }) {
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const timerRef = useRef(null)
  const color = getLabelColor(session.label)

  // Reset confirm state after 3s of inaction so a stray click doesn't linger.
  useEffect(() => {
    if (!confirming) return
    timerRef.current = setTimeout(() => setConfirming(false), 3000)
    return () => clearTimeout(timerRef.current)
  }, [confirming])

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
    <tr className="hover:bg-[var(--app-bg-2)]/50 border-t border-[var(--app-hairline)] transition-colors [transition-duration:var(--app-dur-1)]">
      <td className="min-w-0 px-4 py-3">
        <div className="truncate text-[13.5px] text-[var(--app-fg)]">{session.game_name}</div>
        {session.game_exe && (
          <div className="app-num mt-0.5 truncate text-[11px] text-[var(--app-fg-dim)]">
            {session.game_exe}
          </div>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="inline-flex items-center gap-2">
          <span
            aria-hidden
            className="h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ background: color }}
          />
          <Select
            size="sm"
            options={SELECT_OPTIONS}
            value={session.label || 'tracked'}
            onChange={changeLabel}
            aria-label={`Label for ${session.game_name}, currently ${labelTitle(session.label)}`}
          />
        </div>
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-[13px] text-[var(--app-fg-muted)]">
        <span title={formatDate(session.started_at)}>{relativeTime(session.started_at)}</span>
      </td>
      <td className="app-num whitespace-nowrap px-4 py-3 text-[13px] text-[var(--app-fg)]">
        {formatDuration(session.duration_sec)}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-right">
        {confirming ? (
          <div className="inline-flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="h-8 rounded-[var(--app-r-2)] px-2.5 text-[12px] text-[var(--app-fg-muted)] transition-colors hover:bg-[var(--app-bg-3)] hover:text-[var(--app-fg)]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={busy}
              className="h-8 rounded-[var(--app-r-2)] bg-[var(--app-danger)] px-2.5 text-[12px] text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {busy ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        ) : (
          <IconButton size="sm" label="Delete session" onClick={handleDelete}>
            <Trash2 />
          </IconButton>
        )}
      </td>
    </tr>
  )
}
