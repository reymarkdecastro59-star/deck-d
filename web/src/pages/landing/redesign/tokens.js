// Shared visual tokens for the landing redesign.
// Kept in one file so palette / type shifts are one edit.

export const SECTIONS = [
  { id: 'home', label: 'Home' },
  { id: 'about', label: 'About' },
  { id: 'how', label: 'How It Works' },
  { id: 'features', label: 'Features' },
  { id: 'contact', label: 'Contact' },
]

// Five equal timeline chapters. Each chapter owns two viewport-heights of
// physical scroll, giving the camera and text enough room to arrive, hold,
// and depart without rushing the reader.
export const SECTION_RANGES = {
  home: [0.0, 0.2],
  about: [0.2, 0.4],
  how: [0.4, 0.6],
  features: [0.6, 0.8],
  contact: [0.8, 1.0],
}

// Navigation targets the beginning of each timeline chapter.
export const STICKY_RANGES = {
  home: [0.0, 0.2],
  about: [0.2, 0.4],
  how: [0.4, 0.6],
  features: [0.6, 0.8],
  contact: [0.8, 1.0],
}

// Chapter divider peaks — narrow windows at the transition midpoints so the
// divider only appears while the browser is snapping to the next section.
export const DIVIDER_RANGES = {
  about: { enterStart: 0.16, enterEnd: 0.2, exitEnd: 0.24 },
  how: { enterStart: 0.36, enterEnd: 0.4, exitEnd: 0.44 },
  features: { enterStart: 0.56, enterEnd: 0.6, exitEnd: 0.64 },
  contact: { enterStart: 0.76, enterEnd: 0.8, exitEnd: 0.84 },
}

// Five 200vh slots plus one trailing viewport produce 1000vh of scrollable
// distance after the browser subtracts the visible viewport. That maps every
// 0.2 timeline chapter to exactly 200vh and keeps anchor positions aligned.
export const VIEWPORT_MULT = 2
export const TRAILING_VIEWPORTS = 1

export const COLORS = {
  bg: '#05061a',
  bgDeep: '#000004',
  fg: '#ffffff',
  muted: '#7a7a9e',
  accent: '#4c7dff',
  accentSoft: 'rgba(76, 125, 255, 0.22)',
  accentBorder: 'rgba(76, 125, 255, 0.58)',
  panelBg: 'rgba(5, 8, 28, 0.82)',
  panelBorder: 'rgba(88, 125, 220, 0.42)',
  // Engagement decay palette — reused from existing dashboard.
  active: '#22d3ee',
  drifting: '#f59e0b',
  abandoned: '#6b7280',
}

export const TYPE = {
  display: "'Intel One Mono', ui-monospace, monospace",
  body: "'Inter', sans-serif",
  mono: "'Intel One Mono', ui-monospace, monospace",
}
