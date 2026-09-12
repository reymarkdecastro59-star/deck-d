import { cn } from './cn'

/**
 * Standard authenticated page header — the same eyebrow + h1 + lede block
 * every internal page used to inline. Keeps typography restrained: 24–32px
 * title, no card treatment, no artwork. Right-aligned `aside` slot handles
 * reload buttons, badges, and other page-level chrome.
 */
export function PageHeader({ eyebrow, title, lede, aside, className, children }) {
  return (
    <header className={cn('flex flex-wrap items-start justify-between gap-4', className)}>
      <div className="min-w-0 flex-1">
        {eyebrow && <div className="app-eyebrow text-[var(--app-fg-muted)]">{eyebrow}</div>}
        <h1
          className="mt-2 font-normal tracking-tight text-[var(--app-fg-strong)]"
          style={{ fontSize: 'clamp(24px, 2.4vw, 32px)', lineHeight: 1.1 }}
        >
          {title}
        </h1>
        {lede && (
          <p className="mt-2 max-w-[620px] text-[14px] text-[var(--app-fg-muted)]">{lede}</p>
        )}
        {children && <div className="mt-4">{children}</div>}
      </div>
      {aside && <div className="shrink-0">{aside}</div>}
    </header>
  )
}
