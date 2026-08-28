import { useState, useEffect, useRef, useCallback } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import Navbar from '@/components/layout/Navbar'
import Home from './Home'
import About from './About'
import Service from './Service'
import bgLanding from '@/assets/Bg_Landing.png'

const SECTIONS = [Home, About, Service]

// Persistent background image target states per section.
// Uses Motion's own x / scaleX / opacity props (GPU-only, no layout thrashing).
// Home: image sits on the right half (x=60%, most of it off-screen right).
// About: image slides to the left half (x=-8%, mostly off-screen left edge).
// Service: image fades away entirely.
const BG_STATES = [
  { x: '60%', scaleX: -1, opacity: 0.8 }, // Home
  { x: '-50%', scaleX: -1, opacity: 0.5 }, // About — right half visible, left half off-screen
  { x: '-50%', scaleX: -1, opacity: 0 }, // Service
]

// The bg image must never slide while invisible.
// • Entering Service  → lock x in place, only fade opacity to 0.
// • Leaving  Service  → image was invisible, so snap x instantly
//                       then fade opacity back in. No visible slide.
const BG_EASE = [0.25, 0.46, 0.45, 0.94]

function getBgAnimation(cur, prev) {
  if (cur === 2) {
    return {
      animate: { x: prev === 0 ? '60%' : '-50%', scaleX: -1, opacity: 0 },
      transition: { duration: 0.78, ease: BG_EASE },
    }
  }
  if (prev === 2) {
    return {
      animate: BG_STATES[cur],
      transition: {
        x: { duration: 0 },
        scaleX: { duration: 0 },
        opacity: { duration: 0.78, ease: BG_EASE },
      },
    }
  }
  return {
    animate: BG_STATES[cur],
    transition: { duration: 0.78, ease: BG_EASE },
  }
}

// Transition config: { type: 'horizontal' | 'vertical' | 'fade', fwd: bool }
function getTransConfig(from, to) {
  const fwd = to > from
  if ((from === 0 && to === 1) || (from === 1 && to === 0)) return { type: 'horizontal', fwd }
  if ((from === 1 && to === 2) || (from === 2 && to === 1)) return { type: 'vertical', fwd }
  return { type: 'fade', fwd }
}

// Horizontal (Home↔About): content fades + 20vw nudge.
// The persistent background image sliding 68% of the viewport is the
// primary visual — content nudges alongside it to reinforce direction.
// Vertical (About↔Service): full vertical slide.
// Fade (Home↔Service): zoom crossfade.
const VARIANTS = {
  enter: ({ type, fwd }) => {
    if (type === 'horizontal') return { opacity: 0, x: fwd ? '20vw' : '-20vw', y: 0, scale: 1 }
    // Vertical: starts faded at a partial offset (not a full-page wipe).
    // A 0.20s delay lets About finish its quick exit before Service appears,
    // eliminating text overlap without making it feel like a PPT slide.
    if (type === 'vertical') return { opacity: 0, y: fwd ? '28%' : '-28%', x: 0, scale: 1 }
    // Fade (Home↔Service skip): pure opacity + tiny y nudge, no scale distortion.
    // Scale is the only thing that felt "out of place" — removed entirely.
    return { opacity: 0, scale: 1, y: fwd ? 24 : -24, x: 0 }
  },
  center: ({ type }) => ({
    x: 0,
    y: 0,
    opacity: 1,
    scale: 1,
    transition:
      type === 'vertical'
        ? { duration: 0.5, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }
        : { duration: 0.6, ease: [0.4, 0, 0.2, 1] },
  }),
  exit: ({ type, fwd }) => {
    if (type === 'horizontal')
      return {
        x: fwd ? '-20vw' : '20vw',
        opacity: 0,
        scale: 1,
        y: 0,
        transition: { duration: 0.55, ease: [0.4, 0, 0.2, 1] },
      }
    if (type === 'vertical')
      return {
        y: fwd ? '-14%' : '14%',
        x: 0,
        opacity: 0,
        scale: 1,
        transition: { duration: 0.22, ease: [0.4, 0, 0.6, 1] },
      }
    return {
      opacity: 0,
      scale: 1,
      y: fwd ? -24 : 24,
      x: 0,
      transition: { duration: 0.44, ease: [0.4, 0, 1, 1] },
    }
  },
}

const REDUCED_VARIANTS = {
  enter: () => ({ opacity: 0 }),
  center: () => ({ opacity: 1, transition: { duration: 0.18 } }),
  exit: () => ({ opacity: 0, transition: { duration: 0.18 } }),
}

export default function Landing() {
  const [current, setCurrent] = useState(0)
  const [prevSection, setPrevSection] = useState(-1)
  const [transConfig, setTransConfig] = useState({ type: 'horizontal', fwd: true })
  const isAnimating = useRef(false)
  const panelRef = useRef(null)
  const touchStart = useRef({ x: 0, y: 0 })
  const shouldReduce = useReducedMotion()

  const navigate = useCallback(
    (next) => {
      if (isAnimating.current) return
      if (next < 0 || next > 2 || next === current) return

      setPrevSection(current)
      setTransConfig(getTransConfig(current, next))
      setCurrent(next)
      isAnimating.current = true
      setTimeout(() => {
        isAnimating.current = false
      }, 1050)
    },
    [current]
  )

  // — WHEEL —
  useEffect(() => {
    const onWheel = (e) => {
      if (isAnimating.current) return

      const panel = panelRef.current
      if (panel) {
        const { scrollTop, scrollHeight, clientHeight } = panel
        if (e.deltaY < 0 && scrollTop > 0) return
        if (e.deltaY > 0 && scrollTop + clientHeight < scrollHeight - 2) return
      }

      e.preventDefault()
      if (e.deltaY > 0) navigate(current + 1)
      else navigate(current - 1)
    }

    window.addEventListener('wheel', onWheel, { passive: false })
    return () => window.removeEventListener('wheel', onWheel)
  }, [current, navigate])

  // — KEYBOARD —
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowDown' || e.key === 'PageDown') navigate(current + 1)
      if (e.key === 'ArrowUp' || e.key === 'PageUp') navigate(current - 1)
      if (e.key === 'ArrowRight' && current === 0) navigate(1)
      if (e.key === 'ArrowLeft' && current === 1) navigate(0)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [current, navigate])

  // — TOUCH / SWIPE —
  const onTouchStart = (e) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }
  const onTouchEnd = (e) => {
    if (isAnimating.current) return
    const dx = touchStart.current.x - e.changedTouches[0].clientX
    const dy = touchStart.current.y - e.changedTouches[0].clientY
    const threshold = 60
    if (Math.abs(dy) > Math.abs(dx)) {
      if (dy > threshold) navigate(current + 1)
      if (dy < -threshold) navigate(current - 1)
    } else {
      if (dx > threshold) navigate(current + 1)
      if (dx < -threshold) navigate(current - 1)
    }
  }

  const SectionComp = SECTIONS[current]
  const activeVariants = shouldReduce ? REDUCED_VARIANTS : VARIANTS
  const bgAnim = getBgAnimation(current, prevSection)

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        overflow: 'hidden',
        background: '#0A0918',
        overscrollBehavior: 'none',
      }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Persistent background image — lives here so it never unmounts.
          Animates between Home (right) and About (left) positions in one
          continuous motion, giving the "image sliding" effect rather than
          the whole page swapping. Section components are transparent so
          this shows through their gradient overlays. */}
      <motion.img
        src={bgLanding}
        alt=""
        aria-hidden="true"
        fetchPriority="high"
        loading="eager"
        decoding="sync"
        className="pointer-events-none absolute top-0 h-full select-none object-cover"
        style={{ left: 0, width: '80%', objectFit: 'cover', objectPosition: 'center' }}
        initial={false}
        animate={bgAnim.animate}
        transition={bgAnim.transition}
      />

      <Navbar activeSection={current} onNavigate={navigate} />

      <AnimatePresence mode="sync" custom={transConfig} initial={false}>
        <motion.div
          key={current}
          ref={panelRef}
          custom={transConfig}
          variants={activeVariants}
          initial="enter"
          animate="center"
          exit="exit"
          style={{
            position: 'absolute',
            inset: 0,
            overflowX: 'hidden',
            overflowY: 'hidden',
          }}
        >
          <SectionComp onNavigate={navigate} />
        </motion.div>
      </AnimatePresence>

      {/* Section counter — bottom-left. */}
      <div
        className="section-counter"
        style={{
          position: 'absolute',
          bottom: '40px',
          left: '84px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          zIndex: 100,
          pointerEvents: 'none',
          fontFamily: "'Intel One Mono', ui-monospace, monospace",
          fontSize: '11px',
          fontWeight: 500,
          letterSpacing: '2px',
        }}
      >
        <AnimatePresence mode="wait">
          <motion.span
            key={current}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            style={{ color: 'rgba(255,255,255,0.55)' }}
          >
            {String(current + 1).padStart(2, '0')}
          </motion.span>
        </AnimatePresence>

        <span style={{ color: 'rgba(255,255,255,0.15)', letterSpacing: 0 }}>/</span>

        <span style={{ color: 'rgba(255,255,255,0.20)' }}>
          {String(SECTIONS.length).padStart(2, '0')}
        </span>
      </div>
    </div>
  )
}
