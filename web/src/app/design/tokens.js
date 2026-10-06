// JS access to the Signal Deck tokens in tokens.css.
// Values are CSS variable references, not copies, so charts and inline
// styles follow the active theme (dark/light) and can never drift from the
// brand again (this file used to hold a stale copy of the old blue palette).
// Session label colours stay hex because callers append alpha (`c + '44'`).

export const color = {
  bg: 'var(--app-bg)',
  bg2: 'var(--app-bg-2)',
  bg3: 'var(--app-bg-3)',
  hairline: 'var(--app-hairline)',
  border: 'var(--app-border)',
  borderStrong: 'var(--app-border-strong)',

  fg: 'var(--app-fg)',
  fgStrong: 'var(--app-fg-strong)',
  fgMuted: 'var(--app-fg-muted)',
  fgDim: 'var(--app-fg-dim)',

  accent: 'var(--app-accent)',
  accentHi: 'var(--app-accent-hi)',
  accentTint: 'var(--app-accent-tint)',
  drift: 'var(--app-drift)',
  danger: 'var(--app-danger)',

  // Must match --chip-* in tokens.css.
  chipFocused: '#6C8DFF',
  chipCasual: '#4FB8A5',
  chipStory: '#A579E6',
  chipExploration: '#C89355',
  chipNeutral: '#7A7F9E',
}

// Brand §2.5: at most three series — you (Signal), comparison, baseline.
export const dataViz = ['var(--app-accent)', 'var(--app-series-2)', 'var(--app-fg-muted)']

export const type = {
  fontUi: 'var(--app-font-ui)',
  fontNum: 'var(--app-font-num)',
}

// Session label colors keyed by canonical label name.
// Falls back to chipNeutral for anything unknown.
export const labelColor = {
  focused: color.chipFocused,
  casual: color.chipCasual,
  story: color.chipStory,
  exploration: color.chipExploration,
}

export function getLabelColor(label) {
  if (!label) return color.chipNeutral
  return labelColor[label.toLowerCase()] || color.chipNeutral
}
