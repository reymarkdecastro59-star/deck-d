import { lazy, Suspense, useMemo, useRef } from 'react'
import { motion, useScroll, useTransform, useMotionValueEvent } from 'motion/react'
import { useState } from 'react'
import TopNav from './chrome/TopNav'
import { LeftRail, RightRail } from './chrome/SideRails'
import { useSmoothScroll } from './hooks/useSmoothScroll'
import { SECTIONS, SECTION_RANGES, VIEWPORT_MULT, COLORS, TYPE } from './tokens'

const LandingCanvas = lazy(() => import('./canvas/LandingCanvas'))

// Landing root.
// Owns:
//  - Lenis smooth scroll
//  - Global scroll progress (motion value) driving the R3F canvas + rails
//  - Fixed chrome (nav + rails)
//  - Section anchor stack that provides the scroll runway
// Individual section content will land in ./sections/* as subsequent commits.

export default function Landing() {
  useSmoothScroll(true)

  const rootRef = useRef(null)
  const { scrollYProgress } = useScroll({ target: rootRef, offset: ['start start', 'end end'] })
  const [activeSection, setActiveSection] = useState(0)

  // Snap the section number to the segment that owns the current scroll fraction.
  useMotionValueEvent(scrollYProgress, 'change', (p) => {
    const idx = SECTIONS.findIndex((s) => {
      const [start, end] = SECTION_RANGES[s.id]
      return p >= start && p < end
    })
    const resolved = idx === -1 ? SECTIONS.length - 1 : idx
    if (resolved !== activeSection) setActiveSection(resolved)
  })

  const railProgress = useTransform(scrollYProgress, (v) => v)

  // Scroll runway: 5 sections × VIEWPORT_MULT × 100vh.
  const totalHeightVh = SECTIONS.length * VIEWPORT_MULT * 100

  const handleNavigate = (idx) => {
    if (typeof window === 'undefined') return
    const [start] = SECTION_RANGES[SECTIONS[idx].id]
    // Aim slightly past the segment start so the section content is centered.
    const targetY = document.documentElement.scrollHeight * start + 4
    window.scrollTo({ top: targetY, behavior: 'smooth' })
  }

  const stageStyle = useMemo(
    () => ({
      position: 'relative',
      background: COLORS.bgDeep,
      color: COLORS.fg,
      minHeight: `${totalHeightVh}vh`,
    }),
    [totalHeightVh]
  )

  return (
    <div ref={rootRef} style={stageStyle}>
      {/* Background R3F canvas — position: fixed, behind everything */}
      <Suspense fallback={null}>
        <LandingCanvas scrollProgress={scrollYProgress} />
      </Suspense>

      {/* Persistent chrome */}
      <TopNav activeSection={activeSection} onNavigate={handleNavigate} />
      <LeftRail />
      <RightRail activeSection={activeSection} scrollProgress={railProgress} />

      {/* Section anchor stack — each is 2 viewport heights of scroll runway.
          Content will be rendered as sticky children so the same DOM stays
          in view while scroll advances the R3F camera + Motion animations. */}
      {SECTIONS.map((section) => (
        <section
          key={section.id}
          id={section.id}
          style={{
            position: 'relative',
            height: `${VIEWPORT_MULT * 100}vh`,
            width: '100%',
          }}
        >
          <SectionPlaceholder label={section.label} />
        </section>
      ))}
    </div>
  )
}

// Temporary placeholder — replaced section-by-section starting with §1 HOME.
function SectionPlaceholder({ label }) {
  return (
    <div className="sticky top-0 flex h-dvh items-center justify-center" style={{ zIndex: 2 }}>
      <div
        style={{
          fontFamily: TYPE.mono,
          fontSize: '11px',
          letterSpacing: '3px',
          color: 'rgba(255,255,255,0.35)',
          textTransform: 'uppercase',
        }}
      >
        [ {label} — awaiting section build ]
      </div>
    </div>
  )
}
