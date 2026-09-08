// Shared visual tokens for the landing redesign.
// Kept in one file so palette / type shifts are one edit.

export const SECTIONS = [
  { id: 'home', label: 'Home' },
  { id: 'about', label: 'About' },
  { id: 'how', label: 'How It Works' },
  { id: 'features', label: 'Features' },
  { id: 'contact', label: 'Contact' },
]

// Fractional scroll ranges per section — must sum to 1.
// Non-uniform on purpose: transition sections get more scroll runway
// than "hold" sections so the camera has room to breathe.
export const SECTION_RANGES = {
  home: [0.0, 0.15],
  about: [0.15, 0.5],
  how: [0.5, 0.8],
  features: [0.8, 0.95],
  contact: [0.95, 1.0],
}

// Total scroll height = SECTION_COUNT * VIEWPORT_MULT * 100vh.
// 5 sections × 2vh each = 1000vh (10 viewport heights).
// Shorter than kprverse (18vh) — DECK'D content is denser.
export const VIEWPORT_MULT = 2

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
