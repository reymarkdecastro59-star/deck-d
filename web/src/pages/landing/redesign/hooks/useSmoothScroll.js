import { useEffect } from 'react'
import Lenis from 'lenis'

// Lenis smooth scroll. Was previously disabled while the landing used
// `scroll-snap-type: y mandatory` — the two mechanisms fought each other and
// caused jitter. Snap has been removed, so Lenis is back on and drives the
// window scroll directly.
//
// Motion's useScroll listens to native `scroll` events on the window, which
// Lenis still emits as it updates document.scrollTop each frame. So the
// scrollYProgress motion value continues to work unchanged — Lenis just makes
// the underlying scrollTop travel with ease.

export function useSmoothScroll(enabled = true) {
  useEffect(() => {
    if (!enabled) return

    const lenis = new Lenis({
      duration: 1.05,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.4,
    })

    let rafId = 0
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
