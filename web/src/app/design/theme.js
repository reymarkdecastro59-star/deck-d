// Theme resolver — system (default) / dark / light.
// Writes data-theme + data-motion attributes on <html>.

const THEME_KEY = 'deckd.theme'
const MOTION_KEY = 'deckd.motion'

export const THEMES = ['dark', 'light', 'system']

export function getStoredTheme() {
  try {
    return localStorage.getItem(THEME_KEY) || 'system'
  } catch {
    return 'system'
  }
}

export function getStoredMotion() {
  try {
    return localStorage.getItem(MOTION_KEY) || 'auto'
  } catch {
    return 'auto'
  }
}

function resolveTheme(pref) {
  if (pref === 'system') {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  }
  return pref
}

export function applyTheme(pref) {
  const resolved = resolveTheme(pref)
  document.documentElement.setAttribute('data-theme', resolved)
}

export function setTheme(pref) {
  try {
    localStorage.setItem(THEME_KEY, pref)
  } catch {
    /* storage disabled */
  }
  applyTheme(pref)
}

export function applyMotion(pref) {
  if (pref === 'reduced') {
    document.documentElement.setAttribute('data-motion', 'reduced')
  } else {
    document.documentElement.removeAttribute('data-motion')
  }
}

export function setMotion(pref) {
  try {
    localStorage.setItem(MOTION_KEY, pref)
  } catch {
    /* storage disabled */
  }
  applyMotion(pref)
}

// Call once at boot. index.html already applied the theme before paint;
// this re-applies it and keeps "system" in sync when the OS theme changes.
export function initTheme() {
  applyTheme(getStoredTheme())
  applyMotion(getStoredMotion())
  try {
    window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
      if (getStoredTheme() === 'system') applyTheme('system')
    })
  } catch {
    /* matchMedia unavailable */
  }
}
