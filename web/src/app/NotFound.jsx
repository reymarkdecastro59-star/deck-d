import { Link, useLocation } from 'react-router-dom'
import { Compass, Home } from 'lucide-react'
import { Button } from '@/app/ui/Button'

/**
 * Catch-all 404. Shown outside the AppShell so it renders for both
 * unauthenticated (typo on a marketing URL) and authenticated (typo on an
 * app route) users. The home CTA points at the landing — from there the
 * shell either invites sign-in or resumes the last dashboard visit.
 */
export default function NotFound() {
  const { pathname } = useLocation()
  return (
    <main className="mx-auto flex min-h-dvh max-w-[720px] flex-col items-center justify-center px-8 py-16 text-center">
      <span
        aria-hidden
        className="flex h-14 w-14 items-center justify-center rounded-[var(--app-r-3)] border border-[var(--app-border)] bg-[var(--app-bg-2)] text-[var(--app-fg-muted)]"
      >
        <Compass className="h-6 w-6" strokeWidth={1.5} />
      </span>
      <div className="app-eyebrow mt-6 text-[var(--app-fg-muted)]">404</div>
      <h1
        className="mt-2 font-normal tracking-tight text-[var(--app-fg-strong)]"
        style={{ fontSize: 'clamp(24px, 2.4vw, 32px)', lineHeight: 1.1 }}
      >
        This page doesn't exist.
      </h1>
      <p className="mt-3 max-w-[440px] text-[14px] text-[var(--app-fg-muted)]">
        We couldn't match <span className="app-num text-[var(--app-fg)]">{pathname}</span> to any
        route DECK'D knows about. Try starting from home.
      </p>
      <div className="mt-6">
        <Button as={Link} to="/" variant="primary" leadingIcon={<Home className="h-4 w-4" />}>
          Take me home
        </Button>
      </div>
    </main>
  )
}
