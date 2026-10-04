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
import { SectionHead } from '@/app/ui/SectionHead'
import { Skeleton } from '@/app/ui/Skeleton'
import { useAuth } from '@/auth/AuthContext'
import { deleteProfile } from '@/api/profile'
import { downloadExport } from '@/api/export'
import { resetOnboarding } from '@/app/onboarding/state'
import { formatDate } from '@/lib/format'
import { useProfile } from './useProfile'

const APP_VERSION = '0.1.0'
const CONTACT_EMAIL = import.meta.env.VITE_CONTACT_EMAIL
const CONTACT_URL = CONTACT_EMAIL
  ? `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("DECK'D feedback")}`
  : null
const DOCS_URL = 'https://github.com/reymarkdecastro59-star/deck-d'

const NAV = [
  { id: 'account', label: 'Account' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'data', label: 'Data & privacy' },
  { id: 'help', label: 'Help' },
]

/**
 * Settings — sub-nav + content pane on desktop, a single stacked scroll
 * on mobile. Every "section" is just an <section id=…> with a SectionHead
 * and a bare form-rhythm inside. No icon-in-square headers, no card
 * wrappers per preference. Related controls sit close, unrelated ones
 * are separated by hairlines and section breaks.
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
      <div className="mx-auto max-w-[880px] px-6 py-8 lg:px-10">
        <ErrorState title="We couldn't load your settings" description={error} onRetry={reload} />
      </div>
    )
  }

  const registerSection = (id) => (el) => {
    sectionsRef.current[id] = el
  }

  return (
    <div className="mx-auto w-full px-6 py-8 lg:px-10" style={{ maxWidth: '1100px' }}>
      <h1
        className="font-normal tracking-tight text-[var(--app-fg-strong)]"
        style={{ fontSize: 'clamp(20px, 1.8vw, 26px)' }}
      >
        Settings
      </h1>

      <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[180px_1fr] lg:gap-16">
        <aside className="hidden lg:block">
          <nav className="sticky top-6 space-y-0.5" aria-label="Settings sections">
            {NAV.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={() => setActiveId(item.id)}
                className={
                  activeId === item.id
                    ? 'block border-l-2 border-[var(--app-accent)] py-1.5 pl-3 text-[13px] text-[var(--app-fg-strong)]'
                    : 'block border-l-2 border-transparent py-1.5 pl-3 text-[13px] text-[var(--app-fg-dim)] transition-colors hover:text-[var(--app-fg)]'
                }
              >
                {item.label}
              </a>
            ))}
          </nav>
        </aside>

        <div className="min-w-0 space-y-14">
          <section id="account" ref={registerSection('account')} className="scroll-mt-8">
            <SectionHead eyebrow="Account" title="Signed in through Cognito" />
            <div className="mt-5 divide-y divide-[var(--app-hairline)]">
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
                    onClick={logout}
                  >
                    Sign out
                  </Button>
                }
              />
            </div>
          </section>

          <section id="appearance" ref={registerSection('appearance')} className="scroll-mt-8">
            <SectionHead eyebrow="Appearance" title="Theme" />
            <div className="mt-5 divide-y divide-[var(--app-hairline)]">
              <Row
                label="Theme"
                value="Dark"
                hint="Light mode is coming — we're waiting until we can do it well rather than shipping washed-out screens."
              />
            </div>
          </section>

          <section id="data" ref={registerSection('data')} className="scroll-mt-8">
            <SectionHead eyebrow="Data & privacy" title="Take your data, or erase it entirely" />
            <DataPrivacyRows onDeleted={logout} />
          </section>

          <section id="help" ref={registerSection('help')} className="scroll-mt-8">
            <SectionHead eyebrow="Help" title="About and support" />
            <div className="mt-5 divide-y divide-[var(--app-hairline)]">
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
                hint={
                  CONTACT_URL
                    ? 'Bug reports, feedback, or help — we read every message.'
                    : 'Set VITE_CONTACT_EMAIL in web/.env.local to enable the contact link.'
                }
                action={
                  CONTACT_URL ? (
                    <Button
                      as="a"
                      href={CONTACT_URL}
                      variant="secondary"
                      trailingIcon={<ExternalLink className="h-4 w-4" />}
                    >
                      Send a message
                    </Button>
                  ) : (
                    <Button variant="secondary" disabled>
                      Contact unavailable
                    </Button>
                  )
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
          </section>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, action, hint, tone = 'default' }) {
  return (
    <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="text-[12.5px] uppercase tracking-[0.14em] text-[var(--app-fg-dim)]">
          {label}
        </div>
        {value && (
          <div
            className={
              tone === 'muted'
                ? 'mt-1 text-[13.5px] text-[var(--app-fg-muted)]'
                : 'mt-1 text-[13.5px] text-[var(--app-fg)]'
            }
          >
            {value}
          </div>
        )}
        {hint && (
          <div className="mt-1 max-w-[520px] text-[12px] leading-relaxed text-[var(--app-fg-muted)]">
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
    setMessage('Onboarding reset. Your next visit will start from the consent screen.')
    setTimeout(() => setResetting(false), 1200)
  }

  return (
    <div className="mt-5 divide-y divide-[var(--app-hairline)]">
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
      <div className="py-4">
        <DeleteAccountRow onDeleted={onDeleted} />
      </div>
      {message && (
        <div
          role="status"
          className={
            messageTone === 'danger'
              ? 'border-l-2 border-[var(--app-danger)] py-3 pl-3 text-[12.5px] text-[var(--app-fg)]'
              : 'border-l-2 border-[var(--app-accent-rail)] py-3 pl-3 text-[12.5px] text-[var(--app-fg-muted)]'
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
    <div className="space-y-3">
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

function SettingsSkeleton() {
  return (
    <div className="mx-auto w-full px-6 py-8 lg:px-10" style={{ maxWidth: '1100px' }}>
      <Skeleton className="h-6 w-24" />
      <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[180px_1fr] lg:gap-16">
        <div className="hidden lg:block">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="mb-1 h-4 w-24" />
          ))}
        </div>
        <div className="space-y-14">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-5 w-56" />
              <Skeleton className="mt-4 h-24 w-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
