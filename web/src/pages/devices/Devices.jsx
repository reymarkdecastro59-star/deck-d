import { useMemo, useState } from 'react'
import { Download, Info, MonitorSmartphone, RefreshCw, Shield } from 'lucide-react'
import { Button } from '@/app/ui/Button'
import { Card } from '@/app/ui/Card'
import { EmptyState } from '@/app/ui/EmptyState'
import { ErrorState } from '@/app/ui/ErrorState'
import { IconButton } from '@/app/ui/IconButton'
import { Skeleton } from '@/app/ui/Skeleton'
import { useToast } from '@/app/hooks/useToast'
import { useDevices } from './useDevices'
import { DeviceRow } from './DeviceRow'

const AGENT_DOWNLOAD_URL = 'https://github.com/RM-DC/DECK-D/releases/latest'
const REVOKED_PANEL_ID = 'devices-revoked-panel'

export default function Devices() {
  const { devices, loading, error, reload, rename, revoke } = useDevices()
  const { toast, showToast } = useToast()
  const [showRevoked, setShowRevoked] = useState(false)

  const active = useMemo(() => devices.filter((d) => !d.revoked_at), [devices])
  const revoked = useMemo(() => devices.filter((d) => d.revoked_at), [devices])

  return (
    <div className="mx-auto max-w-[1280px] space-y-6 px-8 py-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <div className="app-eyebrow text-[var(--app-fg-muted)]">Devices</div>
          <h1
            className="mt-2 font-normal tracking-tight text-[var(--app-fg-strong)]"
            style={{ fontSize: 'clamp(24px, 2.4vw, 32px)', lineHeight: 1.1 }}
          >
            Trackers on your account
          </h1>
          <p className="mt-2 max-w-[620px] text-[14px] text-[var(--app-fg-muted)]">
            Every install of the DECK'D tray agent registers here on first sync. Rename them so you
            can tell your desktop from your handheld. Revoke a device to cut off a lost machine —
            the agent stops syncing on its next attempt.
          </p>
        </div>
        {!loading && devices.length > 0 && (
          <IconButton size="sm" label="Reload devices" onClick={reload}>
            <RefreshCw />
          </IconButton>
        )}
      </header>

      {loading && <DevicesSkeleton />}

      {error && (
        <ErrorState title="We couldn't load your devices" description={error} onRetry={reload} />
      )}

      {!loading && !error && devices.length === 0 && (
        <EmptyState
          icon={<MonitorSmartphone className="h-8 w-8" strokeWidth={1.5} />}
          title="No devices registered yet"
          description="Install and launch the tray agent on a PC. It shows up here after the first successful sync."
          action={
            <Button
              as="a"
              href={AGENT_DOWNLOAD_URL}
              target="_blank"
              rel="noreferrer"
              variant="primary"
              leadingIcon={<Download className="h-4 w-4" />}
            >
              Download tracker
            </Button>
          }
        />
      )}

      {!loading && !error && active.length > 0 && (
        <Card padding="none" className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--app-border)] px-5 py-4">
            <div>
              <div className="app-eyebrow text-[var(--app-fg-muted)]">Active</div>
              <p className="mt-1 text-[13px] text-[var(--app-fg-muted)]">
                {active.length.toLocaleString()} device{active.length === 1 ? '' : 's'} syncing.
              </p>
            </div>
            <Button
              as="a"
              href={AGENT_DOWNLOAD_URL}
              target="_blank"
              rel="noreferrer"
              variant="quiet"
              size="sm"
              leadingIcon={<Download className="h-4 w-4" />}
            >
              Add another
            </Button>
          </div>
          <table className="w-full">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-[0.12em] text-[var(--app-fg-dim)]">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">First seen</th>
                <th className="px-4 py-3 font-medium">Last seen</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {active.map((d) => (
                <DeviceRow
                  key={d.device_id}
                  device={d}
                  onRename={rename}
                  onRevoke={revoke}
                  onError={showToast}
                />
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {!loading && !error && revoked.length > 0 && (
        <div>
          <button
            type="button"
            aria-expanded={showRevoked}
            aria-controls={REVOKED_PANEL_ID}
            onClick={() => setShowRevoked((v) => !v)}
            className="app-eyebrow flex items-center gap-2 text-[var(--app-fg-muted)] transition-colors hover:text-[var(--app-fg)]"
          >
            <span>Revoked ({revoked.length})</span>
            <span aria-hidden className="text-[10px]">
              {showRevoked ? '▾' : '▸'}
            </span>
          </button>
          {showRevoked && (
            <Card id={REVOKED_PANEL_ID} padding="none" className="mt-3 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-[0.12em] text-[var(--app-fg-dim)]">
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">First seen</th>
                    <th className="px-4 py-3 font-medium">Revoked</th>
                  </tr>
                </thead>
                <tbody>
                  {revoked.map((d) => (
                    <DeviceRow key={d.device_id} device={d} readOnly />
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}

      {!loading && !error && (
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex items-start gap-3 rounded-[var(--app-r-3)] border border-[var(--app-border)] bg-[var(--app-bg-2)] p-5">
            <Info
              className="mt-0.5 h-4 w-4 shrink-0 text-[var(--app-fg-muted)]"
              strokeWidth={1.75}
            />
            <div className="flex-1">
              <p className="text-[13px] font-medium text-[var(--app-fg)]">How pairing works</p>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-[var(--app-fg-muted)]">
                No codes to type. The tray agent signs you in through your account, generates a
                device ID on that machine, and registers it here on the first sync. Rename it to
                anything — the ID underneath stays the same.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-[var(--app-r-3)] border border-[var(--app-border)] bg-[var(--app-bg-2)] p-5">
            <Shield
              className="mt-0.5 h-4 w-4 shrink-0 text-[var(--app-fg-muted)]"
              strokeWidth={1.75}
            />
            <div className="flex-1">
              <p className="text-[13px] font-medium text-[var(--app-fg)]">Revoking is soft</p>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-[var(--app-fg-muted)]">
                A revoked device is remembered so the same install can't silently re-register — its
                next sync is rejected. Historic sessions from that device stay in your account.
              </p>
            </div>
          </div>
        </section>
      )}

      {toast && (
        <div
          role="alert"
          className="fixed bottom-6 right-6 z-50 max-w-[380px] rounded-[var(--app-r-3)] border border-[var(--app-danger)] bg-[var(--app-danger-tint)] px-4 py-3 text-[13px] text-[var(--app-fg)]"
        >
          {toast}
        </div>
      )}
    </div>
  )
}

function DevicesSkeleton() {
  return (
    <div className="space-y-3 rounded-[var(--app-r-3)] border border-[var(--app-border)] bg-[var(--app-bg-2)] p-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-16" />
        </div>
      ))}
    </div>
  )
}
