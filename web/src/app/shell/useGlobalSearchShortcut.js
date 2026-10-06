import { useEffect } from 'react'

/**
 * Global ⌘K / Ctrl+K shortcut. Attach at the TopBar so it's live everywhere
 * inside the app shell.
 */
export function useGlobalSearchShortcut(onOpen) {
  useEffect(() => {
    const handler = (e) => {
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        onOpen()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onOpen])
}
