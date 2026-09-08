import { useEffect } from 'react'
import Lenis from 'lenis'

// Singleton Lenis instance — mount once at the landing root.
// Native scroll position stays authoritative (Lenis writes to window.scrollY),
// so Motion's useScroll and native anchor links keep working.
export function useSmoothScroll(enabled = true) {
  useEffect(() => {
    if (!enabled) return
    if (typeof window === 'undefined') return
    // Respect reduced motion — do not smooth scroll.
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mq.matches) return

    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.2,
    })

    let rafId
    const raf = (time) => {
      lenis.raf(time)
      rafId = requestAnimationFrame(raf)
    }
    rafId = requestAnimationFrame(raf)

    return () => {
      cancelAnimationFrame(rafId)
      lenis.destroy()
    }
  }, [enabled])
}
