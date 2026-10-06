import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ExternalLink,
  FileJson,
  FileText,
  LogOut,
  MonitorSmartphone,
  RotateCcw,
} from 'lucide-react'
import { Button } from '@/app/ui/Button'
import { ErrorState } from '@/app/ui/ErrorState'
import { Input } from '@/app/ui/Input'
import { Kbd } from '@/app/ui/Kbd'
import { PageFrame, PageHeader } from '@/app/ui/PageHeader'
import { Panel } from '@/app/ui/Panel'
import { SectionHead } from '@/app/ui/SectionHead'
import { SegmentedControl } from '@/app/ui/SegmentedControl'
import { getStoredMotion, getStoredTheme, setMotion, setTheme } from '@/app/design/theme'
import { Skeleton } from '@/app/ui/Skeleton'
import { useAuth } from '@/auth/AuthContext'
import { deleteProfile } from '@/api/profile'
import { downloadExport } from '@/api/export'
import { resetOnboarding } from '@/app/onboarding/state'
import { formatDate } from '@/lib/format'
import { useProfile } from './useProfile'
import { ImportRows } from './ImportRows'

const APP_VERSION = '0.1.0'
const CONTACT_EMAIL = import.meta.env.VITE_CONTACT_EMAIL
const CONTACT_URL = CONTACT_EMAIL
  ? `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("DECK'D feedback")}`
  : null
const DOCS_URL = 'https://github.com/reymarkdecastro59-star/deck-d'

const NAV = [
  { id: 'account', label: 'Account' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'imports', label: 'Steam import' },
  { id: 'data', label: 'Data & privacy' },
  { id: 'help', label: 'Help' },
]

/**
 * Settings — sub-nav + content on desktop, one stacked scroll on phone.
 * Each section is a panel (common region) with a section title and rows:
 * a 15px label, its value or one-line hint, and the control on the right.
 */
export default function Settings() {
  const { email, logout } = useAuth()
  const { profile, loading, error, reload } = useProfile()
  const [activeId, setActiveId] = useState('account')
  const sectionsRef = useRef({})

  // Track the nearest section header in the viewport so the desktop
  // sub-nav highlights the section the user is reading.
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible.length > 0) setActiveId(visible[0].target.id)
      },
      { rootMargin: '-100px 0px -60% 0px', threshold: [0, 1] }
    )
    Object.values(sectionsRef.current).forEach((el) => el && obs.observe(el))
    return () => obs.disconnect()
  }, [loading])

  if (loading) return <SettingsSkeleton />
  if (error) {
    return (
      <PageFrame>
        <PageHeader title="Settings" />
        <ErrorState title="We couldn't load your settings" description={error} onRetry={reload} />
      </PageFrame>
    )
  }

  const registerSection = (id) => (el) => {
    sectionsRef.current[id] = el
  }

  return (
    <PageFrame>
      <PageHeader title="Settings" lede="Your account, how DECK'D looks, and your data." />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[200px_minmax(0,880px)] lg:gap-12">
        <aside className="hidden lg:block">
          <nav className="sticky top-6 space-y-0.5" aria-label="Settings sections">
            {NAV.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={() => setActiveId(item.id)}
                aria-current={activeId === item.id ? 'true' : undefined}
                className={
                  activeId === item.id
                    ? 'flex h-10 items-center rounded-[var(--app-r-2)] bg-[var(--app-accent-tint)] px-3 text-[15px] font-semibold text-[var(--app-fg-strong)] shadow-[inset_2px_0_0_var(--app-accent)]'
                    : 'app-wt-small flex h-10 items-center rounded-[var(--app-r-2)] px-3 text-[15px] text-[var(--app-fg-muted)] transition-colors hover:bg-[var(--app-bg-3)] hover:text-[var(--app-fg)]'
                }
              >
                {item.label}
              </a>
            ))}
          </nav>
        </aside>

        <div className="min-w-0 space-y-6">
          <Section id="account" register={registerSection} title="Account">
            <div className="divide-y divide-[var(--app-hairline)]">
              <Row label="Email" value={email || profile?.email || '—'} />
              <Row label="Member since" value={formatDate(profile?.created_at, 'long')} />
              <Row
                label="Session"
                value="Signed in on this device"
                hint="Signing out doesn't delete anything. Your data stays in your account."
                action={
                  <Button
                    variant="secondary"
                    leadingIcon={<LogOut className="h-4 w-4" />}
                    onClick={logout}
                  >
                    Sign out
                  </Button>
                }
              />
            </div>
          </Section>

          <Section id="appearance" register={registerSection} title="Appearance">
            <AppearanceRows />
          </Section>

          <Section
            id="imports"
            register={registerSection}
            title="Steam import"
            description="Playtime Steam recorded before DECK'D"
          >
            <ImportRows Row={Row} />
          </Section>

          <Section
            id="data"
            register={registerSection}
            title="Data & privacy"
            description="Take your data with you, or erase it entirely"
          >
            <DataPrivacyRows onDeleted={logout} />
          </Section>

          <Section id="help" register={registerSection} title="Help">
            <div className="divide-y divide-[var(--app-hairline)]">
              <Row
                label="Keyboard shortcuts"
                value={
                  <span className="inline-flex items-center gap-2">
                    Open search
                    <Kbd>⌘</Kbd>
                    <span className="text-[var(--app-fg-dim)]">or</span>
                    <Kbd>Ctrl</Kbd>
                    <Kbd>K</Kbd>
                  </span>
                }
              />
              {/* Only shown when a contact address is configured — users never
                  see setup instructions meant for the developer. */}
              {CONTACT_URL && (
                <Row
                  label="Contact"
                  hint="Bug reports, feedback or help. Every message is read."
                  action={
                    <Button
                      as="a"
                      href={CONTACT_URL}
                      variant="secondary"
                      trailingIcon={<ExternalLink className="h-4 w-4" />}
                    >
                      Send a message
                    </Button>
                  }
                />
              )}
              <Row
                label="Documentation"
                hint="Install notes and the roadmap, on GitHub."
                action={
                  <Button
                    as="a"
                    href={DOCS_URL}
                    target="_blank"
                    rel="noreferrer"
                    variant="secondary"
                    trailingIcon={<ExternalLink className="h-4 w-4" />}
                  >
                    Open README
                  </Button>
                }
              />
              <Row
                label="Legal"
                hint="The terms of use and how your data is handled."
                action={
                  <div className="flex flex-wrap gap-2">
                    <Button as={Link} to="/legal/terms" size="sm" variant="secondary">
                      Terms
                    </Button>
                    <Button as={Link} to="/legal/privacy" size="sm" variant="secondary">
                      Privacy
                    </Button>
                  </div>
                }
              />
              <Row
                label="Version"
                value={<span className="app-num">{APP_VERSION}</span>}
                tone="muted"
              />
            </div>
          </Section>
        </div>
      </div>
    </PageFrame>
  )
}

function Section({ id, register, title, description, children }) {
  return (
    <section id={id} ref={register(id)} aria-labelledby={`${id}-title`} className="scroll-mt-24">
      <Panel as="div" className="py-3 sm:py-4">
        <SectionHead
          id={`${id}-title`}
          title={title}
          description={description}
          className="mb-1 pt-2"
        />
        {children}
      </Panel>
    </section>
  )
}

const THEME_OPTIONS = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]
const MOTION_OPTIONS = [
  { value: 'auto', label: 'System' },
  { value: 'reduced', label: 'Reduced' },
]

function AppearanceRows() {
  const [theme, setThemeState] = useState(getStoredTheme)
  const [motion, setMotionState] = useState(getStoredMotion)
  return (
    <div className="divide-y divide-[var(--app-hairline)]">
      <Row
        label="Theme"
        hint="System follows your device's light or dark setting."
        action={
          <SegmentedControl
            items={THEME_OPTIONS}
            value={theme}
            ariaLabel="Theme"
            onChange={(v) => {
              setTheme(v)
              setThemeState(v)
            }}
          />
        }
      />
      <Row
        label="Motion"
        hint="Reduced turns off hover lifts and animated transitions."
        action={
          <SegmentedControl
            items={MOTION_OPTIONS}
            value={motion}
            ariaLabel="Motion"
            onChange={(v) => {
              setMotion(v)
              setMotionState(v)
            }}
          />
        }
      />
    </div>
  )
}

function Row({ label, value, action, hint, tone = 'default' }) {
  return (
    <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <div className="text-[15px] font-semibold text-[var(--app-fg-strong)]">{label}</div>
        {value && (
          <div
            className={
              tone === 'muted'
                ? 'app-wt-small mt-1 text-[15px] text-[var(--app-fg-muted)]'
                : 'mt-1 text-[15px] text-[var(--app-fg)]'
            }
          >
            {value}
          </div>
        )}
        {hint && (
          <div className="app-wt-small mt-1 max-w-[560px] text-[14px] leading-[1.5] text-[var(--app-fg-muted)]">
            {hint}
          </div>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

function DataPrivacyRows({ onDeleted }) {
  const [exporting, setExporting] = useState(null)
  const [message, setMessage] = useState(null)
  const [messageTone, setMessageTone] = useState('info')
  const [resetting, setResetting] = useState(false)

  const runExport = async (format) => {
    setExporting(format)
    setMessage(null)
    try {
      const filename = await downloadExport(format)
      setMessageTone('info')
      setMessage(`Saved ${filename}.`)
    } catch (err) {
      setMessageTone('danger')
      setMessage(err.message || 'Export failed')
    } finally {
      setExporting(null)
    }
  }

  const handleReset = () => {
    resetOnboarding()
    setResetting(true)
    setMessageTone('info')
    setMessage('Done. The welcome steps will show on your next visit.')
    setTimeout(() => setResetting(false), 1200)
  }

  return (
    <div className="divide-y divide-[var(--app-hairline)]">
      <Row
        label="Export your data"
        hint="Every session you've recorded. CSV opens in a spreadsheet; JSON is for developers."
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              leadingIcon={<FileText className="h-4 w-4" />}
              loading={exporting === 'csv'}
              onClick={() => runExport('csv')}
            >
              CSV
            </Button>
            <Button
              size="sm"
              variant="secondary"
              leadingIcon={<FileJson className="h-4 w-4" />}
              loading={exporting === 'json'}
              onClick={() => runExport('json')}
            >
              JSON
            </Button>
          </div>
        }
      />
      <Row
        label="Paired devices"
        hint="Rename or remove the PCs running the tracker."
        action={
          <Button
            as={Link}
            to="/devices"
            variant="secondary"
            leadingIcon={<MonitorSmartphone className="h-4 w-4" />}
          >
            Manage devices
          </Button>
        }
      />
      <Row
        label="Welcome steps"
        hint="Show the first-run setup again on your next visit."
        action={
          <Button
            variant="secondary"
            leadingIcon={<RotateCcw className="h-4 w-4" />}
            loading={resetting}
            onClick={handleReset}
          >
            Reset onboarding
          </Button>
        }
      />
      <div className="py-4">
        <DeleteAccountRow onDeleted={onDeleted} />
      </div>
      {message && (
        <div
          role="status"
          className={
            messageTone === 'danger'
              ? 'border-l-2 border-[var(--app-danger)] py-3 pl-3 text-[14px] text-[var(--app-fg)]'
              : 'border-l-2 border-[var(--app-accent-rail)] py-3 pl-3 text-[14px] text-[var(--app-fg-muted)]'
          }
        >
          {message}
        </div>
      )}
    </div>
  )
}

function DeleteAccountRow({ onDeleted }) {
  const [confirming, setConfirming] = useState(false)
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const cancel = () => {
    setConfirming(false)
    setTyped('')
    setError(null)
  }

  const confirmDelete = async () => {
    setBusy(true)
    setError(null)
    try {
      await deleteProfile()
      onDeleted?.()
      window.location.href = '/'
    } catch (err) {
      setError(err.message || 'Failed to delete account')
      setBusy(false)
    }
  }

  if (!confirming) {
    return (
      <Row
        label="Delete account"
        hint="Permanently erases your sessions, devices and account. This can't be undone."
        action={
          <Button
            variant="danger"
            leadingIcon={<AlertTriangle className="h-4 w-4" />}
            onClick={() => setConfirming(true)}
          >
            Delete account
          </Button>
        }
      />
    )
  }

  return (
    <div className="space-y-3">
      <div>
        <div className="text-[15px] font-semibold text-[var(--app-fg-strong)]">
          Type <span className="app-num text-[var(--app-danger)]">DELETE</span> to confirm
        </div>
        <div className="app-wt-small mt-1 text-[14px] text-[var(--app-fg-muted)]">
          This runs immediately. You'll be signed out and returned to the landing page.
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="max-w-[220px] flex-1">
          <Input
            autoFocus
            aria-label="Type DELETE to confirm"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder="DELETE"
            invalid={typed.length > 0 && typed !== 'DELETE'}
          />
        </div>
        <Button variant="ghost" onClick={cancel} disabled={busy}>
          Cancel
        </Button>
        <Button
          variant="danger"
          onClick={confirmDelete}
          disabled={typed !== 'DELETE' || busy}
          loading={busy}
        >
          Delete forever
        </Button>
      </div>
      {error && (
        <div role="alert" className="text-[14px] text-[var(--app-danger)]">
          {error}
        </div>
      )}
    </div>
  )
}

function SettingsSkeleton() {
  return (
    <PageFrame>
      <Skeleton className="h-9 w-36" />
      <Skeleton className="mt-3 h-4 w-72" />
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[200px_minmax(0,880px)] lg:gap-12">
        <div className="hidden space-y-1 lg:block">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[220px] rounded-[var(--app-r-3)]" />
          ))}
        </div>
      </div>
    </PageFrame>
  )
}
