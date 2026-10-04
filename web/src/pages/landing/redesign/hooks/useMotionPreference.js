import { useSyncExternalStore } from 'react'

const query = '(prefers-reduced-motion: reduce)'
const subscribe = (notify) => {
  const media = window.matchMedia(query)
  media.addEventListener('change', notify)
  return () => media.removeEventListener('change', notify)
}
const snapshot = () => window.matchMedia(query).matches
const serverSnapshot = () => false

// Motion 13's useReducedMotion captures the preference only at mount.
export function useMotionPreference() {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot)
}
