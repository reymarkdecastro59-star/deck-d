import { memo, useEffect, useRef, useState } from 'react'
import { Check, Pencil, Trash2, X } from 'lucide-react'
import { Button } from '@/app/ui/Button'
import { IconButton } from '@/app/ui/IconButton'
import { Input } from '@/app/ui/Input'
import { formatDate, relativeTime } from '@/lib/format'

function DeviceRowImpl({ device, onRename, onRevoke, onError, readOnly = false }) {
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
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setConfirming(false)}
                disabled={busy}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={handleRevoke}
                disabled={busy}
                loading={busy}
                className="!bg-[var(--app-danger)] hover:!bg-[var(--app-danger)] hover:opacity-90"
              >
                {busy ? 'Revoking…' : 'Revoke'}
              </Button>
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

export const DeviceRow = memo(DeviceRowImpl)
