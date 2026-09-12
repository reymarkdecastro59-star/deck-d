import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ExternalLink,
  FileJson,
  FileText,
  HelpCircle,
  LogOut,
  MonitorSmartphone,
  Palette,
  RotateCcw,
  ShieldCheck,
  User,
} from 'lucide-react'
import { Button } from '@/app/ui/Button'
import { Card } from '@/app/ui/Card'
import { ErrorState } from '@/app/ui/ErrorState'
import { Input } from '@/app/ui/Input'
import { Kbd } from '@/app/ui/Kbd'
import { Skeleton } from '@/app/ui/Skeleton'
import { useAuth } from '@/auth/AuthContext'
import { deleteProfile } from '@/api/profile'
import { downloadExport } from '@/api/export'
import { resetOnboarding } from '@/app/onboarding/state'
import { formatDate } from '@/lib/format'
import { useProfile } from './useProfile'

const APP_VERSION = '0.1.0'
const CONTACT_URL = '/#contact'
const DOCS_URL = 'https://github.com/reymarkdecastro59-star/deck-d'

export default function Settings() {
  const { email, logout } = useAuth()
  const { profile, loading, error, reload } = useProfile()

  if (loading) return <SettingsSkeleton />
  if (error) {
    return (
      <div className="mx-auto max-w-[880px] px-8 py-8">
        <ErrorState title="We couldn't load your settings" description={error} onRetry={reload} />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[880px] space-y-8 px-8 py-8">
      <header>
        <div className="app-eyebrow text-[var(--app-fg-muted)]">Settings</div>
        <h1
          className="mt-2 font-normal tracking-tight text-[var(--app-fg-strong)]"
          style={{ fontSize: 'clamp(24px, 2.4vw, 32px)', lineHeight: 1.1 }}
        >
          Your account
        </h1>
        <p className="mt-2 max-w-[560px] text-[14px] text-[var(--app-fg-muted)]">
          Manage the pieces of DECK'D that live outside a single page — account, appearance, data
          export, and account erasure.
        </p>
      </header>

      <AccountSection profile={profile} email={email} onSignOut={logout} />
      <AppearanceSection />
      <DataPrivacySection onDeleted={logout} />
      <HelpSection />
    </div>
  )
}

function Section({ icon, title, description, children }) {
  return (
    <section>
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--app-r-2)] bg-[var(--app-bg-3)] text-[var(--app-fg-muted)]">
          {icon}
        </span>
        <div>
          <h2 className="text-[15px] font-medium tracking-tight text-[var(--app-fg-strong)]">
            {title}
          </h2>
          {description && (
            <p className="mt-1 text-[13px] text-[var(--app-fg-muted)]">{description}</p>
          )}
        </div>
      </div>
      {children}
    </section>
  )
}

function Row({ label, value, action, hint, tone = 'default' }) {
  return (
    <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="text-[13px] text-[var(--app-fg-muted)]">{label}</div>
        {value && (
          <div
            className={
              tone === 'muted'
                ? 'mt-0.5 text-[13.5px] text-[var(--app-fg-muted)]'
                : 'mt-0.5 text-[13.5px] text-[var(--app-fg)]'
            }
          >
            {value}
          </div>
        )}
        {hint && <div className="mt-1 text-[12px] text-[var(--app-fg-dim)]">{hint}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

function AccountSection({ profile, email, onSignOut }) {
  return (
    <Section
      icon={<User className="h-4 w-4" strokeWidth={1.75} />}
      title="Account"
      description="Signed in through Cognito. Your email is read-only for now — reach out if you need to change it."
    >
      <Card padding="none">
        <div className="divide-y divide-[var(--app-hairline)] px-5">
          <Row label="Email" value={email || profile?.email || '—'} />
          <Row label="Member since" value={formatDate(profile?.created_at, 'long')} />
          <Row
            label="Session"
            value="Signed in on this device."
            hint="Sign out clears your token locally. Your data stays on the server."
            action={
              <Button
                variant="secondary"
                leadingIcon={<LogOut className="h-4 w-4" />}
                onClick={onSignOut}
              >
                Sign out
              </Button>
            }
          />
        </div>
      </Card>
    </Section>
  )
}

function AppearanceSection() {
  return (
    <Section
      icon={<Palette className="h-4 w-4" strokeWidth={1.75} />}
      title="Appearance"
      description="DECK'D ships dark by default. A theme picker is on the roadmap once the app has real surfaces to theme."
    >
      <Card padding="none">
        <div className="px-5">
          <Row
            label="Theme"
            value="Dark"
            hint="Light mode is coming — we're waiting until we can do it well rather than shipping washed-out screens."
          />
        </div>
      </Card>
    </Section>
  )
}

function DataPrivacySection({ onDeleted }) {
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
    setMessage('Onboarding reset. Your next visit will start from the consent screen.')
    setTimeout(() => setResetting(false), 1200)
  }

  return (
    <Section
      icon={<ShieldCheck className="h-4 w-4" strokeWidth={1.75} />}
      title="Data & privacy"
      description="Take your data with you, revisit the first-run flow, or erase everything on demand."
    >
      <Card padding="none">
        <div className="divide-y divide-[var(--app-hairline)] px-5">
          <Row
            label="Export your data"
            hint="Every session, plus overlap-stripped totals in the CSV header. JSON contains the raw session objects."
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
            hint="Rename or revoke the trackers you've installed on other machines."
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
            label="First-run flow"
            hint="Reset the local onboarding record so consent + survey run again on your next visit."
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
          <div className="py-2">
            <DeleteAccountRow onDeleted={onDeleted} />
          </div>
        </div>
        {message && (
          <div
            role="status"
            className={
              messageTone === 'danger'
                ? 'border-t border-[var(--app-danger)] bg-[var(--app-danger-tint)] px-5 py-3 text-[12.5px] text-[var(--app-fg)]'
                : 'border-t border-[var(--app-hairline)] bg-[var(--app-bg-3)] px-5 py-3 text-[12.5px] text-[var(--app-fg-muted)]'
            }
          >
            {message}
          </div>
        )}
      </Card>
    </Section>
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
      // Cognito identity is gone — sign the user out and bounce to landing.
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
        hint="Erases every session, device, and profile record on the server, then removes your Cognito login. There's no undo."
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
    <div className="space-y-3 py-4">
      <div>
        <div className="text-[13px] text-[var(--app-fg)]">
          Type <span className="app-num text-[var(--app-danger)]">DELETE</span> to confirm
        </div>
        <div className="mt-1 text-[12px] text-[var(--app-fg-muted)]">
          This runs immediately. You'll be signed out and returned to the landing page.
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="max-w-[220px] flex-1">
          <Input
            size="sm"
            autoFocus
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
      {error && <div className="text-[12.5px] text-[var(--app-danger)]">{error}</div>}
    </div>
  )
}

function HelpSection() {
  return (
    <Section
      icon={<HelpCircle className="h-4 w-4" strokeWidth={1.75} />}
      title="Help & about"
      description="Where to send feedback, and what version you're on."
    >
      <Card padding="none">
        <div className="divide-y divide-[var(--app-hairline)] px-5">
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
          <Row
            label="Contact"
            hint="Bug reports, feedback, or help — we read every message."
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
          <Row
            label="Documentation"
            hint="Source, install notes, and roadmap on GitHub."
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
            hint="Terms and privacy — the honest, hobby-scale version."
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
      </Card>
    </Section>
  )
}

function SettingsSkeleton() {
  return (
    <div className="mx-auto max-w-[880px] space-y-8 px-8 py-8">
      <div className="space-y-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-3/4 max-w-[560px]" />
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-36 w-full" />
        </div>
      ))}
    </div>
  )
}
