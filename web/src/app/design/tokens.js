// JS mirror of the CSS custom properties in tokens.css.
// Use these in JS-driven contexts (chart primitives, motion values, canvas fills).
// If you edit values here, edit tokens.css to match.

export const color = {
  bg: '#06070E',
  bg2: '#0A0B18',
  bg3: '#10122A',
  bgRaised: '#141636',
  hairline: 'rgba(120, 140, 200, 0.08)',
  border: 'rgba(120, 140, 200, 0.16)',
  borderStrong: 'rgba(120, 140, 200, 0.28)',
  scrim: 'rgba(4, 5, 12, 0.72)',

  fg: '#E8EAF4',
  fgStrong: '#FFFFFF',
  fgMuted: '#8A8FAE',
  fgDim: '#5C6180',

  accent: '#4C7DFF',
  accentHi: '#7096FF',
  accentLo: '#2E4FB8',
  accentTint: 'rgba(76, 125, 255, 0.10)',
  accentRail: 'rgba(76, 125, 255, 0.55)',
  accentRing: 'rgba(76, 125, 255, 0.32)',

  ok: '#3FBF87',
  okTint: 'rgba(63, 191, 135, 0.12)',
  warn: '#E0A54B',
  warnTint: 'rgba(224, 165, 75, 0.12)',
  danger: '#E06565',
  dangerTint: 'rgba(224, 101, 101, 0.12)',

  chipFocused: '#6C8DFF',
  chipCasual: '#4FB8A5',
  chipStory: '#A579E6',
  chipExploration: '#C89355',
  chipNeutral: '#7A7F9E',
}

// Data-vis palette — used only by charts. Ordered so consecutive series stay legible.
export const dataViz = [
  '#4C7DFF', // accent
  '#4FB8A5', // teal
  '#A579E6', // violet
  '#C89355', // amber
  '#E06565', // coral
  '#6C8DFF', // periwinkle
  '#3FBF87', // green
  '#7A7F9E', // neutral
]

export const space = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
}

export const radius = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  pill: 999,
}

export const layout = {
  sidebarW: 224,
  topbarH: 56,
  contentMax: 1440,
  gutter: 32,
}

export const type = {
  fontUi: "'Inter', ui-sans-serif, system-ui, sans-serif",
  fontDisplay: "'Intel One Mono', ui-monospace, monospace",
  fontNum: "'Intel One Mono', ui-monospace, monospace",
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
