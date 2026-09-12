import { memo, useEffect, useRef, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/app/ui/Button'
import { IconButton } from '@/app/ui/IconButton'
import { Select } from '@/app/ui/Select'
import { getLabelColor } from '@/app/design/tokens'
import { formatDate, formatDuration, relativeTime } from '@/lib/format'
import { LABELS, labelTitle } from './labels'

const SELECT_OPTIONS = LABELS.map((l) => ({ value: l.value, label: l.title }))

function SessionRowImpl({ session, onPatch, onDelete, onError }) {
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
        <span title={formatDate(session.started_at, 'time')}>
          {relativeTime(session.started_at)}
        </span>
      </td>
      <td className="app-num whitespace-nowrap px-4 py-3 text-[13px] text-[var(--app-fg)]">
        {formatDuration(session.duration_sec)}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-right">
        {confirming ? (
          <div className="inline-flex items-center gap-1.5">
            <Button size="sm" variant="ghost" onClick={() => setConfirming(false)} disabled={busy}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={handleDelete}
              disabled={busy}
              loading={busy}
              className="!bg-[var(--app-danger)] hover:!bg-[var(--app-danger)] hover:opacity-90"
            >
              {busy ? 'Deleting…' : 'Delete'}
            </Button>
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

// Sessions can render 500 rows — memo means unrelated parent re-renders
// (search/sort/filter state changes) don't cascade into every row.
export const SessionRow = memo(SessionRowImpl)
