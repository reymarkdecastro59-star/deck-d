import { useEffect } from 'react'

// Selector for what counts as "focusable" inside a dialog. Deliberately
// broad — covers native form controls, links with hrefs, and anything
// explicitly opted in with a non-negative tabindex.
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function focusableWithin(root) {
  if (!root) return []
  return Array.from(root.querySelectorAll(FOCUSABLE)).filter(
    (el) => !el.hasAttribute('disabled') && el.offsetParent !== null
  )
}

/**
 * useFocusTrap(ref, active) — when `active` is true, cycles Tab / Shift+Tab
 * within the focusables inside ref.current. On activation, saves the current
 * focus and moves it into the panel; on deactivation, restores the saved
 * focus. Complements aria-modal on the dialog element.
 */
export function useFocusTrap(ref, active) {
  useEffect(() => {
    if (!active) return
    const root = ref.current
    if (!root) return

    const restoreTarget = typeof document !== 'undefined' ? document.activeElement : null

    // Push focus in on the next tick so any initial autofocus in the
    // panel (e.g. the search input) still wins.
    const focusIn = setTimeout(() => {
      const focusables = focusableWithin(root)
      if (focusables.length && !root.contains(document.activeElement)) {
        focusables[0].focus()
      }
    }, 0)

    const handleKey = (e) => {
      if (e.key !== 'Tab') return
      const focusables = focusableWithin(root)
      if (focusables.length === 0) {
        e.preventDefault()
        return
      }
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const active = document.activeElement
      if (e.shiftKey && (active === first || !root.contains(active))) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && (active === last || !root.contains(active))) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKey)

    return () => {
      clearTimeout(focusIn)
      document.removeEventListener('keydown', handleKey)
      if (restoreTarget && typeof restoreTarget.focus === 'function') {
        restoreTarget.focus()
      }
    }
  }, [ref, active])
}
