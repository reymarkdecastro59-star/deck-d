import { useMemo, useState } from 'react'
import { Download, MonitorSmartphone, RefreshCw } from 'lucide-react'
import { Button } from '@/app/ui/Button'
import { EmptyState } from '@/app/ui/EmptyState'
import { ErrorState } from '@/app/ui/ErrorState'
import { IconButton } from '@/app/ui/IconButton'
import { PageFrame, PageHeader } from '@/app/ui/PageHeader'
import { Panel, PanelHead } from '@/app/ui/Panel'
import { Skeleton } from '@/app/ui/Skeleton'
import { useToast } from '@/app/hooks/useToast'
import { useDevices } from './useDevices'
import { DeviceRow } from './DeviceRow'

const AGENT_DOWNLOAD_URL = '/downloads/deckd.exe'
const REVOKED_PANEL_ID = 'devices-revoked-panel'

/**
 * Devices — a utility screen: title + actions, the device table in a panel,
 * revoked devices behind a disclosure, and a short "how it works" panel.
 */
export default function Devices() {
  const { devices, loading, error, reload, rename, revoke } = useDevices()
  const { toast, showToast } = useToast()
  const [showRevoked, setShowRevoked] = useState(false)

  const active = useMemo(() => devices.filter((d) => !d.revoked_at), [devices])
  const revoked = useMemo(() => devices.filter((d) => d.revoked_at), [devices])

  return (
    <PageFrame>
      <PageHeader
        title="Devices"
        count={loading ? null : active.length}
        countLabel={active.length === 1 ? 'device' : 'devices'}
        lede="The PCs running the DECK'D tracker for your account."
        actions={
          <>
            <Button
              as="a"
              href={AGENT_DOWNLOAD_URL}
              download="deckd.exe"
              variant="secondary"
              leadingIcon={<Download className="h-4 w-4" />}
            >
              Download tracker
            </Button>
            {!loading && devices.length > 0 && (
              <IconButton label="Reload devices" onClick={reload}>
                <RefreshCw />
              </IconButton>
            )}
          </>
        }
      />

      <div>
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
          <Panel aria-labelledby="dv-active">
            <PanelHead
              id="dv-active"
              title="Connected"
              description="Rename a device so you can tell your desktop from your handheld"
            />
            <div className="-mx-4 overflow-x-auto">
              <table className="w-full min-w-[560px]">
                <thead>
                  <tr className="app-wt-small text-left text-[13px] text-[var(--app-fg-muted)]">
                    <th className="border-b border-[var(--app-hairline)] pb-2.5 pl-4 pr-4 font-medium">
                      Name
                    </th>
                    <th className="border-b border-[var(--app-hairline)] px-4 pb-2.5 font-medium">
                      First seen
                    </th>
                    <th className="border-b border-[var(--app-hairline)] px-4 pb-2.5 font-medium">
                      Last seen
                    </th>
                    <th className="border-b border-[var(--app-hairline)] px-4 pb-2.5 text-right font-medium">
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
            </div>
          </Panel>
        )}

        {!loading && !error && revoked.length > 0 && (
          <section className="mt-10">
            <button
              type="button"
              aria-expanded={showRevoked}
              aria-controls={REVOKED_PANEL_ID}
              onClick={() => setShowRevoked((v) => !v)}
              className="inline-flex h-10 items-center gap-2 rounded-[var(--app-r-2)] text-[15px] font-semibold text-[var(--app-fg)] transition-colors hover:text-[var(--app-fg-strong)]"
            >
              <span aria-hidden className="text-[13px] text-[var(--app-fg-muted)]">
                {showRevoked ? '▾' : '▸'}
              </span>
              <span>Revoked devices ({revoked.length})</span>
            </button>
            {showRevoked && (
              <table id={REVOKED_PANEL_ID} className="mt-3 w-full">
                <thead>
                  <tr className="app-wt-small text-left text-[13px] text-[var(--app-fg-muted)]">
                    <th className="border-b border-[var(--app-hairline)] pb-2.5 pl-4 pr-4 font-medium">
                      Name
                    </th>
                    <th className="border-b border-[var(--app-hairline)] px-4 pb-2.5 font-medium">
                      First seen
                    </th>
                    <th className="border-b border-[var(--app-hairline)] px-4 pb-2.5 font-medium">
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
        <Panel aria-labelledby="dv-how" className="mt-6">
          <PanelHead id="dv-how" title="How devices work" />
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <h3 className="text-[15px] font-semibold text-[var(--app-fg-strong)]">Adding a PC</h3>
              <p className="app-wt-small mt-1.5 text-[15px] leading-[1.55] text-[var(--app-fg-muted)]">
                Install the tracker and sign in. The PC appears here after it checks in, usually
                within a minute. There are no codes to type.
              </p>
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-[var(--app-fg-strong)]">
                Removing a PC
              </h3>
              <p className="app-wt-small mt-1.5 text-[15px] leading-[1.55] text-[var(--app-fg-muted)]">
                Revoking stops that PC from syncing. Sessions it already recorded stay in your
                account.
              </p>
            </div>
          </div>
        </Panel>
      )}

      {toast && (
        <div
          role="alert"
          className="fixed bottom-6 right-6 z-50 max-w-[380px] rounded-[var(--app-r-3)] border border-[var(--app-danger)] bg-[var(--app-danger-tint)] px-4 py-3 text-[14px] text-[var(--app-fg)]"
        >
          {toast}
        </div>
      )}
    </PageFrame>
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
