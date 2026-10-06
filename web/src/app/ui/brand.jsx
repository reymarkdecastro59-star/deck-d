import { cn } from './cn'
import { STATE_LABEL } from '@/lib/gameState'

/**
 * Signal Deck brand primitives shared by the shell and pages:
 * the wordmark (apostrophe = signal tick), the three stage glyphs,
 * the Active/Drifting/Dormant shape marks and trend arrows.
 * Meaning is always carried by shape + label, never colour alone.
 */

export function Wordmark({ size = 20, className }) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex items-start font-semibold leading-none text-[var(--app-fg-strong)]',
        className
      )}
      style={{ fontSize: size, letterSpacing: '-0.02em', fontFamily: 'var(--app-font-ui)' }}
    >
      DECK
      <span
        className="inline-block rounded-[1px] bg-[var(--app-accent)]"
        style={{
          width: Math.max(2, Math.round(size * 0.13)),
          height: Math.round(size * 0.42),
          margin: `1px ${Math.max(2, Math.round(size * 0.1))}px 0`,
        }}
      />
      D
    </span>
  )
}

const GLYPHS = {
  overview: (
    <>
      <rect x="3" y="1.5" width="10" height="13" rx="1.5" />
      <path d="M8 5v3.5" />
    </>
  ),
  track: (
    <>
      <path d="M1 8h12" />
      <path d="M11 5l3 3-3 3" />
      <circle cx="4" cy="8" r="1.4" fill="currentColor" />
      <circle cx="8" cy="8" r="1.4" fill="currentColor" />
    </>
  ),
  understand: (
    <>
      <path d="M1.5 14.5h13" />
      <path d="M4 12V9" />
      <path d="M8 12V4.5" />
      <path d="M12 12V7" />
    </>
  ),
  recommend: (
    <>
      <path d="M1.5 1.5L6 8" />
      <path d="M14.5 1.5L10 8" />
      <path d="M8 1.5V8" />
      <rect x="5.25" y="9" width="5.5" height="6" rx="1" />
    </>
  ),
}

/** Stage glyph — geometry, not colour, identifies Track / Understand / Recommend. */
export function StageGlyph({ name, size = 16, className, strokeWidth = 1.5 }) {
  return (
    <svg
      aria-hidden
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('shrink-0', className)}
    >
      {GLYPHS[name]}
    </svg>
  )
}

const STATE_COLOR = {
  active: 'var(--app-accent)',
  drifting: 'var(--app-drift)',
  dormant: 'var(--app-fg-dim)',
}

/** ● Active · ◐ Drifting · ○ Dormant. `color` overrides for use on art. */
export function StateShape({ state, size = 10, color }) {
  const c = color ?? STATE_COLOR[state] ?? STATE_COLOR.dormant
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 10 10" className="shrink-0">
      {state === 'active' ? (
        <circle cx="5" cy="5" r="4" fill={c} />
      ) : state === 'drifting' ? (
        <>
          <circle cx="5" cy="5" r="3.9" fill="none" stroke={c} strokeWidth="1.4" />
          <path d="M5 1.1A3.9 3.9 0 0 0 5 8.9Z" fill={c} />
        </>
      ) : (
        <circle cx="5" cy="5" r="3.9" fill="none" stroke={c} strokeWidth="1.4" />
      )}
    </svg>
  )
}

/** Shape + label. `hideLabel` keeps the label for screen readers only. */
export function GameStateMark({ state, hideLabel = false, className }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <StateShape state={state} />
      <span
        className={cn(
          hideLabel ? 'sr-only' : 'text-[13px] text-[var(--app-fg-muted)]',
          'app-wt-small'
        )}
      >
        {STATE_LABEL[state] ?? STATE_LABEL.dormant}
      </span>
    </span>
  )
}

const TREND_LABEL = { up: 'rising', down: 'falling', flat: 'steady' }

/** ▲ / ▼ / — with an accessible label; direction never relies on colour. */
export function TrendMark({ trend = 'flat', size = 14, className }) {
  return (
    <span
      role="img"
      aria-label={TREND_LABEL[trend]}
      className={cn(
        'inline-flex shrink-0',
        trend === 'up' ? 'text-[var(--app-fg)]' : 'text-[var(--app-fg-dim)]',
        className
      )}
    >
      <svg
        aria-hidden
        width={size}
        height={size}
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {trend === 'up' ? (
          <>
            <path d="M8 13V3" />
            <path d="M4 7l4-4 4 4" />
          </>
        ) : trend === 'down' ? (
          <>
            <path d="M8 3v10" />
            <path d="M4 9l4 4 4-4" />
          </>
        ) : (
          <path d="M3 8h10" />
        )}
      </svg>
    </span>
  )
}
