import { cn } from './cn'

/**
 * Standard authenticated page header — eyebrow with leading hairline,
 * display title, optional lede paragraph, optional right-aligned aside
 * slot for reload buttons or badges.
 *
 * Restrained by design: pages need scannability first, not drama. The
 * dashboard has its own inline hero for the entrance moment; every other
 * page uses this compact block.
 */
export function PageHeader({ eyebrow, title, lede, aside, className, children }) {
  return (
    <header className={cn('flex flex-wrap items-start justify-between gap-4', className)}>
      <div className="min-w-0 flex-1">
        {eyebrow && (
          <div
            className="app-eyebrow text-[10.5px] text-[var(--app-fg-muted)]"
            style={{ letterSpacing: '0.22em' }}
          >
            {eyebrow}
          </div>
        )}
        <h1
          className="mt-3 font-normal leading-[1.1] tracking-tight text-[var(--app-fg-strong)]"
          style={{ fontSize: 'clamp(24px, 2.4vw, 32px)' }}
        >
          {title}
        </h1>
        {lede && (
          <p className="mt-2 max-w-[620px] text-[14px] leading-relaxed text-[var(--app-fg-muted)]">
            {lede}
          </p>
        )}
        {children && <div className="mt-4">{children}</div>}
      </div>
      {aside && <div className="shrink-0">{aside}</div>}
    </header>
  )
}
