import { useMemo, useState } from 'react'
import { Download, MonitorSmartphone, RefreshCw } from 'lucide-react'
import { Button } from '@/app/ui/Button'
import { EmptyState } from '@/app/ui/EmptyState'
import { ErrorState } from '@/app/ui/ErrorState'
import { IconButton } from '@/app/ui/IconButton'
import { SectionHead } from '@/app/ui/SectionHead'
import { Skeleton } from '@/app/ui/Skeleton'
import { useToast } from '@/app/hooks/useToast'
import { useDevices } from './useDevices'
import { DeviceRow } from './DeviceRow'

const AGENT_DOWNLOAD_URL = '/downloads/deckd.exe'
const REVOKED_PANEL_ID = 'devices-revoked-panel'

/**
 * Devices — a utility screen. Compact toolbar, table on the page (no card
 * wrapper), quiet paragraph notes at the bottom. The brief says devices
 * doesn't need cinematic treatment; the composition matches.
 */
export default function Devices() {
  const { devices, loading, error, reload, rename, revoke } = useDevices()
  const { toast, showToast } = useToast()
  const [showRevoked, setShowRevoked] = useState(false)

  const active = useMemo(() => devices.filter((d) => !d.revoked_at), [devices])
  const revoked = useMemo(() => devices.filter((d) => d.revoked_at), [devices])

  return (
    <div
      className="mx-auto w-full px-6 py-8 lg:px-10"
      style={{ maxWidth: 'var(--app-content-max)' }}
    >
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex items-baseline gap-3">
          <h1
            className="font-normal tracking-tight text-[var(--app-fg-strong)]"
            style={{ fontSize: 'clamp(20px, 1.8vw, 26px)' }}
          >
            Devices
          </h1>
          <span className="app-num text-[13px] text-[var(--app-fg-dim)]">
            {loading ? '' : active.length.toLocaleString()}
          </span>
        </div>
        <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
          <Button
            as="a"
            href={AGENT_DOWNLOAD_URL}
            download="deckd.exe"
            variant="secondary"
            size="sm"
            leadingIcon={<Download className="h-4 w-4" />}
          >
            Download tracker
          </Button>
          {!loading && devices.length > 0 && (
            <IconButton size="sm" label="Reload devices" onClick={reload}>
              <RefreshCw />
            </IconButton>
          )}
        </div>
      </div>

      <p className="mt-3 max-w-[640px] text-[13px] leading-relaxed text-[var(--app-fg-muted)]">
        Every install of the DECK&apos;D tray agent registers on first sync. Rename them so you can
        tell your desktop from your handheld. Revoking cuts a device off on its next sync attempt —
        historic sessions from that machine stay in your account.
      </p>

      <div className="mt-8">
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
                download="deckd.exe"
                variant="primary"
                leadingIcon={<Download className="h-4 w-4" />}
              >
                Download tracker
              </Button>
            }
          />
        )}

        {!loading && !error && active.length > 0 && (
          <section>
            <SectionHead
              eyebrow="Active"
              title={`${active.length.toLocaleString()} device${active.length === 1 ? '' : 's'} syncing`}
            />
            <table className="mt-3 w-full">
              <thead>
                <tr className="text-left text-[10.5px] uppercase tracking-[0.16em] text-[var(--app-fg-dim)]">
                  <th className="border-b border-[var(--app-hairline)] pb-2 pl-0 pr-4 font-medium">
                    Name
                  </th>
                  <th className="border-b border-[var(--app-hairline)] pb-2 pr-4 font-medium">
                    First seen
                  </th>
                  <th className="border-b border-[var(--app-hairline)] pb-2 pr-4 font-medium">
                    Last seen
                  </th>
                  <th className="border-b border-[var(--app-hairline)] pb-2 pr-0 text-right font-medium">
                    Actions
                  </th>
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
          </section>
        )}

        {!loading && !error && revoked.length > 0 && (
          <section className="mt-10">
            <button
              type="button"
              aria-expanded={showRevoked}
              aria-controls={REVOKED_PANEL_ID}
              onClick={() => setShowRevoked((v) => !v)}
              className="app-eyebrow inline-flex items-center gap-2 text-[10px] text-[var(--app-fg-muted)] transition-colors hover:text-[var(--app-fg)]"
            >
              <span>Revoked ({revoked.length})</span>
              <span aria-hidden className="text-[10px]">
                {showRevoked ? '▾' : '▸'}
              </span>
            </button>
            {showRevoked && (
              <table id={REVOKED_PANEL_ID} className="mt-3 w-full">
                <thead>
                  <tr className="text-left text-[10.5px] uppercase tracking-[0.16em] text-[var(--app-fg-dim)]">
                    <th className="border-b border-[var(--app-hairline)] pb-2 pl-0 pr-4 font-medium">
                      Name
                    </th>
                    <th className="border-b border-[var(--app-hairline)] pb-2 pr-4 font-medium">
                      First seen
                    </th>
                    <th className="border-b border-[var(--app-hairline)] pb-2 pr-0 font-medium">
                      Revoked
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {revoked.map((d) => (
                    <DeviceRow key={d.device_id} device={d} readOnly />
                  ))}
                </tbody>
              </table>
            )}
          </section>
        )}
      </div>

      {!loading && !error && (
        <div className="mt-12 border-t border-[var(--app-hairline)] pt-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <div className="app-eyebrow text-[10px] text-[var(--app-fg-dim)]">Pairing</div>
              <p className="mt-2 text-[12.5px] leading-relaxed text-[var(--app-fg-muted)]">
                No codes to type. The tray agent signs you in through your account, generates a
                device ID on that machine, and registers it here on the first sync. Rename it to
                anything — the ID underneath stays the same.
              </p>
            </div>
            <div>
              <div className="app-eyebrow text-[10px] text-[var(--app-fg-dim)]">Revoking</div>
              <p className="mt-2 text-[12.5px] leading-relaxed text-[var(--app-fg-muted)]">
                A revoked device is remembered so the same install can&apos;t silently re-register —
                its next sync is rejected. Historic sessions from that device stay in your account.
              </p>
            </div>
          </div>
        </div>
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
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 py-2">
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-16" />
        </div>
      ))}
    </div>
  )
}
