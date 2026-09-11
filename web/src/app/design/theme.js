// Theme resolver — dark (default) / light / system.
// Writes data-theme + data-motion attributes on <html>.

const THEME_KEY = 'deckd.theme'
const MOTION_KEY = 'deckd.motion'

export const THEMES = ['dark', 'light', 'system']

export function getStoredTheme() {
  try {
    return localStorage.getItem(THEME_KEY) || 'dark'
  } catch {
    return 'dark'
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

// Call once at boot before React mounts to avoid a flash.
export function initTheme() {
  applyTheme(getStoredTheme())
  applyMotion(getStoredMotion())
}
