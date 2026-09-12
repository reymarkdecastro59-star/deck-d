import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

/**
 * Shared frame for legal pages. Renders outside the AppShell — reachable
 * from onboarding, footer, and Settings without requiring auth. Keeps typography
 * calm and readable; no marketing chrome.
 */
export function LegalLayout({ eyebrow, title, effective, children }) {
  return (
    <div className="app-root min-h-dvh bg-[var(--app-bg)] text-[var(--app-fg)]">
      <div className="mx-auto max-w-[720px] px-8 py-12">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-[13px] text-[var(--app-fg-muted)] transition-colors hover:text-[var(--app-fg)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.75} />
          Back to home
        </Link>
        <header className="mt-8">
          <div className="app-eyebrow text-[var(--app-fg-muted)]">{eyebrow}</div>
          <h1
            className="mt-2 font-normal tracking-tight text-[var(--app-fg-strong)]"
            style={{ fontSize: 'clamp(28px, 3vw, 40px)', lineHeight: 1.1 }}
          >
            {title}
          </h1>
          {effective && (
            <p className="app-num mt-3 text-[12.5px] text-[var(--app-fg-dim)]">
              Effective {effective}
            </p>
          )}
        </header>
        <article className="legal-prose mt-10 space-y-6">{children}</article>
      </div>
    </div>
  )
}
