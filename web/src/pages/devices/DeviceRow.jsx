import { useEffect, useRef, useState } from 'react'
import { Check, Pencil, Trash2, X } from 'lucide-react'
import { IconButton } from '@/app/ui/IconButton'
import { Input } from '@/app/ui/Input'

function formatDate(unix) {
  if (!unix) return '—'
  return new Date(unix * 1000).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function relativeTime(unix) {
  if (!unix) return '—'
  const diff = Date.now() / 1000 - unix
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86_400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604_800) return `${Math.floor(diff / 86_400)}d ago`
  return new Date(unix * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function DeviceRow({ device, onRename, onRevoke, onError, readOnly = false }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(device.device_name)
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => {
    if (!confirming) return
    timerRef.current = setTimeout(() => setConfirming(false), 3000)
    return () => clearTimeout(timerRef.current)
  }, [confirming])

  const startEdit = () => {
    setValue(device.device_name)
    setEditing(true)
  }

  const cancelEdit = () => {
    setValue(device.device_name)
    setEditing(false)
  }

  const commitEdit = async () => {
    const trimmed = value.trim()
    if (!trimmed || trimmed === device.device_name) {
      cancelEdit()
      return
    }
    setBusy(true)
    try {
      await onRename(device.device_id, trimmed)
      setEditing(false)
    } catch (err) {
      onError?.(err.message || 'Failed to rename device')
    } finally {
      setBusy(false)
    }
  }

  const handleRevoke = async () => {
    if (!confirming) {
      setConfirming(true)
      return
    }
    setBusy(true)
    try {
      await onRevoke(device.device_id)
    } catch (err) {
      onError?.(err.message || 'Failed to revoke device')
      setBusy(false)
      setConfirming(false)
    }
  }

  return (
    <tr className="hover:bg-[var(--app-bg-2)]/50 border-t border-[var(--app-hairline)] transition-colors [transition-duration:var(--app-dur-1)]">
      <td className="min-w-0 px-4 py-3">
        {editing ? (
          <div className="max-w-[280px]">
            <Input
              size="sm"
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitEdit()
                if (e.key === 'Escape') cancelEdit()
              }}
              maxLength={64}
            />
          </div>
        ) : (
          <div className="truncate text-[13.5px] text-[var(--app-fg)]">{device.device_name}</div>
        )}
        <div className="app-num mt-0.5 truncate text-[11px] text-[var(--app-fg-dim)]">
          {device.device_id}
        </div>
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-[13px] text-[var(--app-fg-muted)]">
        <span title={formatDate(device.first_seen)}>{relativeTime(device.first_seen)}</span>
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-[13px] text-[var(--app-fg-muted)]">
        {readOnly ? (
          <span title={formatDate(device.revoked_at)}>{relativeTime(device.revoked_at)}</span>
        ) : (
          <span title={formatDate(device.last_seen)}>{relativeTime(device.last_seen)}</span>
        )}
      </td>
      {!readOnly && (
        <td className="whitespace-nowrap px-4 py-3 text-right">
          {editing ? (
            <div className="inline-flex items-center gap-1">
              <IconButton size="sm" label="Cancel rename" onClick={cancelEdit} disabled={busy}>
                <X />
              </IconButton>
              <IconButton size="sm" label="Save name" onClick={commitEdit} disabled={busy}>
                <Check />
              </IconButton>
            </div>
          ) : confirming ? (
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
                onClick={handleRevoke}
                disabled={busy}
                className="h-8 rounded-[var(--app-r-2)] bg-[var(--app-danger)] px-2.5 text-[12px] text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {busy ? 'Revoking…' : 'Revoke'}
              </button>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1">
              <IconButton size="sm" label="Rename device" onClick={startEdit}>
                <Pencil />
              </IconButton>
              <IconButton size="sm" label="Revoke device" onClick={handleRevoke}>
                <Trash2 />
              </IconButton>
            </div>
          )}
        </td>
      )}
    </tr>
  )
}
