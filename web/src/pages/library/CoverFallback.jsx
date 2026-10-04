/**
 * Placeholder rendered inside a game cover slot when the artwork URL is
 * missing or fails safeUrl validation. A single monospaced initial is a
 * stronger recognition cue than a generic gamepad icon — the user's own
 * mental model of the title carries most of the identification load once
 * the letter matches.
 */
export function CoverFallback({ name }) {
  const initial = (name || '?').trim().charAt(0).toUpperCase() || '?'
  return (
    <div
      className="absolute inset-0 flex items-center justify-center"
      style={{ background: 'var(--app-bg-3)' }}
      aria-hidden
    >
      <span
        className="app-num select-none text-[36px] leading-none text-[var(--app-fg-muted)]"
        style={{ fontFamily: 'var(--app-font-display)' }}
      >
        {initial}
      </span>
    </div>
  )
}
