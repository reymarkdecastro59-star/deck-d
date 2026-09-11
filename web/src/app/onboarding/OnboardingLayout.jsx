import { cn } from '@/app/ui/cn'

/**
 * Full-screen onboarding shell. Renders the brand mark, a segmented progress
 * bar, the step content, and a footer action row provided by the step.
 */
export function OnboardingLayout({ stepIdx, totalSteps, eyebrow, title, lede, children, footer }) {
  return (
    <div className="app-root flex min-h-dvh flex-col bg-[var(--app-bg)] text-[var(--app-fg)]">
      {/* Header — brand + progress */}
      <header className="mx-auto w-full max-w-[720px] px-8 pb-4 pt-8">
        <div className="mb-8 flex items-center gap-2">
          <span
            aria-hidden
            className="flex h-6 w-6 items-center justify-center rounded-[6px] bg-[var(--app-accent)] text-[11px] font-semibold text-white"
          >
            D
          </span>
          <span className="text-[14px] font-medium tracking-[0.14em] text-[var(--app-fg-strong)]">
            DECK<span className="text-[var(--app-accent)]">&apos;</span>D
          </span>
        </div>

        <ProgressBar current={stepIdx} total={totalSteps} />

        <div className="mt-8">
          {eyebrow && <p className="app-eyebrow mb-3">{eyebrow}</p>}
          <h1
            className="font-medium tracking-tight text-[var(--app-fg-strong)]"
            style={{ fontSize: 'clamp(24px, 2.4vw, 32px)', lineHeight: 'var(--app-lh-tight)' }}
          >
            {title}
          </h1>
          {lede && (
            <p className="mt-3 max-w-[560px] text-[15px] leading-[var(--app-lh-snug)] text-[var(--app-fg-muted)]">
              {lede}
            </p>
          )}
        </div>
      </header>

      {/* Body — step content */}
      <div className="mx-auto w-full max-w-[720px] flex-1 px-8 pb-8">{children}</div>

      {/* Footer — actions provided by the step */}
      {footer && (
        <footer className="bg-[var(--app-bg)]/85 sticky bottom-0 border-t border-[var(--app-border)] backdrop-blur-sm">
          <div className="mx-auto flex w-full max-w-[720px] items-center justify-between gap-4 px-8 py-4">
            {footer}
          </div>
        </footer>
      )}
    </div>
  )
}

function ProgressBar({ current, total }) {
  return (
    <div
      className="flex items-center gap-1.5"
      role="progressbar"
      aria-valuenow={current + 1}
      aria-valuemin={1}
      aria-valuemax={total}
    >
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={cn(
            'h-1 flex-1 rounded-full transition-colors [transition-duration:var(--app-dur-2)]',
            i < current
              ? 'bg-[var(--app-accent)]'
              : i === current
                ? 'bg-[var(--app-accent-hi)]'
                : 'bg-[var(--app-bg-3)]'
          )}
        />
      ))}
    </div>
  )
}
