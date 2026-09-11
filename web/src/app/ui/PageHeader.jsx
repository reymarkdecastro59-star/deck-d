import { cn } from './cn'

/**
 * Standard authenticated page header.
 * - eyebrow: small uppercase kicker
 * - title:   the primary page title
 * - lede:    one-line description
 * - artwork: optional url — renders atmospheric background on the right
 * - aside:   right-aligned content (buttons, kicker quote, meta)
 */
export function PageHeader({ eyebrow, title, lede, artwork, aside, className, children }) {
  return (
    <header
      className={cn(
        'relative overflow-hidden rounded-[var(--app-r-3)]',
        'border border-[var(--app-border)] bg-[var(--app-bg-2)]',
        className
      )}
    >
      {artwork && (
        <>
          <div
            aria-hidden
            className="absolute inset-0 bg-cover bg-center opacity-60"
            style={{ backgroundImage: `url(${artwork})` }}
          />
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(90deg, var(--app-bg-2) 0%, var(--app-bg-2) 42%, rgba(10,11,24,0.55) 68%, rgba(10,11,24,0) 100%)',
            }}
          />
        </>
      )}

      <div className="relative flex min-h-[184px] items-end justify-between gap-8 p-8 lg:p-10">
        <div className="max-w-[62%]">
          {eyebrow && <div className="app-eyebrow mb-3">{eyebrow}</div>}
          <h1
            className="font-normal tracking-tight text-[var(--app-fg-strong)]"
            style={{ fontSize: 'clamp(28px, 3.2vw, 44px)', lineHeight: 1.05 }}
          >
            {title}
          </h1>
          {lede && (
            <p className="mt-3 max-w-[560px] text-[15px] leading-relaxed text-[var(--app-fg-muted)]">
              {lede}
            </p>
          )}
          {children && <div className="mt-5">{children}</div>}
        </div>
        {aside && <div className="shrink-0 text-right">{aside}</div>}
      </div>
    </header>
  )
}
