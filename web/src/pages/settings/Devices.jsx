import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { listDevices, renameDevice, revokeDevice } from '@/api/devices'
import { useAuth } from '@/auth/AuthContext'

function formatRelative(unix) {
  if (!unix) return '—'
  const diff = Date.now() / 1000 - unix
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

const CELL = {
  padding: '14px 18px',
  fontFamily: 'Inter, sans-serif',
  fontSize: '13.5px',
  color: '#E5E5F2',
}
const MONO = {
  ...CELL,
  fontFamily: "'Intel One Mono', ui-monospace, monospace",
  fontVariantNumeric: 'tabular-nums',
  color: '#C8C8E0',
}
const HEADER = {
  padding: '12px 18px',
  fontFamily: "'Intel One Mono', monospace",
  fontSize: '10.5px',
  fontWeight: 600,
  letterSpacing: '1.8px',
  textTransform: 'uppercase',
  color: '#7A7A9E',
  textAlign: 'left',
}
const BUTTON = {
  padding: '6px 12px',
  borderRadius: '6px',
  background: 'rgba(5, 8, 28, 0.72)',
  border: '1px solid rgba(88,125,220,0.32)',
  color: '#C8C8E0',
  fontFamily: 'Inter, sans-serif',
  fontSize: '12.5px',
  cursor: 'pointer',
  transition: 'background 150ms ease, border-color 150ms ease',
}
const DANGER = {
  ...BUTTON,
  borderColor: 'rgba(245, 169, 127, 0.34)',
  color: '#F5A97F',
}

export default function Devices() {
  const [devices, setDevices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [busyId, setBusyId] = useState(null)
  const { email, logout } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    listDevices()
      .then((data) => setDevices(data.devices || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  function startEdit(device) {
    setEditingId(device.device_id)
    setEditValue(device.device_name)
  }

  async function saveEdit(device) {
    const trimmed = editValue.trim()
    if (!trimmed || trimmed === device.device_name) {
      setEditingId(null)
      return
    }
    setBusyId(device.device_id)
    try {
      const resp = await renameDevice(device.device_id, trimmed)
      setDevices((prev) => prev.map((d) => (d.device_id === device.device_id ? resp.device : d)))
      setEditingId(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  async function handleRevoke(device) {
    const ok = window.confirm(
      `Revoke "${device.device_name}"? The agent on that machine will be signed out on its next sync.`
    )
    if (!ok) return
    setBusyId(device.device_id)
    try {
      const resp = await revokeDevice(device.device_id)
      setDevices((prev) => prev.map((d) => (d.device_id === device.device_id ? resp.device : d)))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const active = devices.filter((d) => !d.revoked_at)
  const revoked = devices.filter((d) => d.revoked_at)

  return (
    <div style={{ minHeight: '100vh', background: '#0A0918', color: '#E5E5F2' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 32px',
          borderBottom: '1px solid rgba(88,125,220,0.14)',
        }}
      >
        <h1
          style={{
            fontFamily: "'Intel One Mono', ui-monospace, monospace",
            fontSize: '18px',
            fontWeight: 500,
            letterSpacing: '-0.4px',
            color: '#fff',
          }}
        >
          DECK&apos;D
        </h1>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '18px',
            fontFamily: 'Inter, sans-serif',
            fontSize: '13px',
          }}
        >
          <Link to="/dashboard" style={{ color: '#8A8AA8', textDecoration: 'none' }}>
            Sessions
          </Link>
          <span style={{ color: '#8A8AA8' }}>{email}</span>
          <button type="button" onClick={handleLogout} style={{ ...BUTTON, padding: '8px 16px' }}>
            Sign out
          </button>
        </div>
      </header>

      <main style={{ maxWidth: '1080px', margin: '0 auto', padding: '40px 32px' }}>
        <h2
          style={{
            fontFamily: "'Intel One Mono', ui-monospace, monospace",
            fontSize: 'clamp(24px, 2.4vw, 32px)',
            fontWeight: 500,
            letterSpacing: '-0.8px',
            lineHeight: 1.15,
            color: '#fff',
            marginBottom: '12px',
          }}
        >
          Devices
        </h2>
        <p
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '13.5px',
            color: '#7A7A9E',
            marginBottom: '28px',
            lineHeight: 1.5,
          }}
        >
          Every install of the DECK&apos;D tray agent registers here on first sync. Revoke one to
          cut off a lost or old machine — the agent will be signed out on its next attempt.
        </p>

        {loading && (
          <p style={{ color: '#8A8AA8', fontFamily: 'Inter, sans-serif', fontSize: '14px' }}>
            Loading…
          </p>
        )}

        {error && (
          <p
            role="alert"
            style={{ color: '#F5A97F', fontFamily: 'Inter, sans-serif', fontSize: '14px' }}
          >
            {error}
          </p>
        )}

        {!loading && !error && devices.length === 0 && (
          <div
            style={{
              padding: '64px 24px',
              borderRadius: '14px',
              background: 'rgba(5,8,28,0.72)',
              border: '1px solid rgba(88,125,220,0.24)',
              textAlign: 'center',
            }}
          >
            <p
              style={{
                fontFamily: "'Intel One Mono', monospace",
                fontSize: '16px',
                color: '#C8C8E0',
                marginBottom: '10px',
              }}
            >
              No devices registered yet.
            </p>
            <p
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '13.5px',
                color: '#7A7A9E',
                lineHeight: 1.6,
              }}
            >
              Install and run the tray agent on a PC. It shows up here after the first sync.
            </p>
          </div>
        )}

        {!loading && !error && devices.length > 0 && (
          <DeviceTable
            title="Active"
            rows={active}
            editingId={editingId}
            editValue={editValue}
            setEditValue={setEditValue}
            busyId={busyId}
            onStartEdit={startEdit}
            onSaveEdit={saveEdit}
            onCancelEdit={() => setEditingId(null)}
            onRevoke={handleRevoke}
          />
        )}

        {!loading && !error && revoked.length > 0 && (
          <div style={{ marginTop: '36px' }}>
            <DeviceTable
              title="Revoked"
              rows={revoked}
              editingId={null}
              busyId={busyId}
              revokedView
            />
          </div>
        )}
      </main>
    </div>
  )
}

function DeviceTable({
  title,
  rows,
  editingId,
  editValue,
  setEditValue,
  busyId,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onRevoke,
  revokedView = false,
}) {
  return (
    <>
      <h3
        style={{
          fontFamily: "'Intel One Mono', monospace",
          fontSize: '11px',
          fontWeight: 600,
          letterSpacing: '2px',
          textTransform: 'uppercase',
          color: '#7A7A9E',
          marginBottom: '10px',
        }}
      >
        {title}
      </h3>
      <div
        style={{
          overflowX: 'auto',
          borderRadius: '14px',
          background: 'rgba(5,8,28,0.72)',
          border: '1px solid rgba(88,125,220,0.24)',
          boxShadow: '0 0 0 1px rgba(88,125,220,0.06), 0 12px 40px rgba(0,0,0,0.55)',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(88,125,220,0.18)' }}>
              <th style={HEADER}>Name</th>
              <th style={HEADER}>First seen</th>
              <th style={HEADER}>Last seen</th>
              {!revokedView && <th style={{ ...HEADER, textAlign: 'right' }}>Actions</th>}
              {revokedView && <th style={{ ...HEADER, textAlign: 'right' }}>Revoked</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((d, i) => {
              const isEditing = editingId === d.device_id
              const busy = busyId === d.device_id
              return (
                <tr
                  key={d.device_id}
                  style={{ borderTop: i === 0 ? 'none' : '1px solid rgba(88,125,220,0.10)' }}
                >
                  <td style={CELL}>
                    {isEditing ? (
                      <input
                        autoFocus
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => onSaveEdit(d)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') onSaveEdit(d)
                          if (e.key === 'Escape') onCancelEdit()
                        }}
                        maxLength={64}
                        style={{
                          width: '100%',
                          padding: '6px 10px',
                          background: 'rgba(0,0,0,0.4)',
                          border: '1px solid rgba(88,125,220,0.5)',
                          borderRadius: '6px',
                          color: '#fff',
                          fontFamily: 'Inter, sans-serif',
                          fontSize: '13.5px',
                        }}
                      />
                    ) : (
                      <span>{d.device_name}</span>
                    )}
                  </td>
                  <td style={MONO}>{formatRelative(d.first_seen)}</td>
                  <td style={MONO}>{formatRelative(d.last_seen)}</td>
                  {!revokedView && (
                    <td style={{ ...CELL, textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => (isEditing ? onSaveEdit(d) : onStartEdit(d))}
                          style={BUTTON}
                        >
                          {isEditing ? 'Save' : 'Rename'}
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => onRevoke(d)}
                          style={DANGER}
                        >
                          Revoke
                        </button>
                      </div>
                    </td>
                  )}
                  {revokedView && (
                    <td style={{ ...MONO, textAlign: 'right', color: '#7A7A9E' }}>
                      {formatRelative(d.revoked_at)}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}
