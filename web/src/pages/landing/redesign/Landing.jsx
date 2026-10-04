import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useScroll, useMotionValueEvent } from 'motion/react'
import { useMotionPreference } from './hooks/useMotionPreference'
import TopNav from './chrome/TopNav'
import { useSmoothScroll } from './hooks/useSmoothScroll'
import { TimelineProvider } from './hooks/useMasterTimeline'
import {
  PHASE_ORDER,
  PHASES,
  NAV_POINTS,
  QA_POINTS,
  phaseIndex,
  FEATURE_BEATS,
} from './hooks/timelinePhases'
import HeroSection from './sections/HeroSection'
import AboutSection from './sections/AboutSection'
import HowItWorksSection from './sections/HowItWorksSection'
import FeaturesSection from './sections/FeaturesSection'
import ContactSection from './sections/ContactSection'
const LandingCanvas = lazy(() => import('./canvas/LandingCanvas'))
const PrevisOverlay = lazy(() => import('./canvas/PrevisOverlay'))
const SCROLL_VH = 2400
export default function Landing() {
  const preference = useMotionPreference()
  const previs = import.meta.env.DEV && new URLSearchParams(window.location.search).has('previs')
  const [reducedPreview, setReducedPreview] = useState(false)
  const reducedMotion = preference || reducedPreview
  useSmoothScroll(!reducedMotion)
  const rootRef = useRef(null)
  const initialHashHandled = useRef(false)
  const { scrollYProgress } = useScroll({ target: rootRef, offset: ['start start', 'end end'] })
  const [activeSection, setActiveSection] = useState(0)
  useMotionValueEvent(scrollYProgress, 'change', (p) => setActiveSection(phaseIndex(p)))
  const navigate = useCallback(
    (id, point) => {
      const target = point ?? NAV_POINTS[id]
      if (target == null) return
      const total = rootRef.current.offsetHeight - window.innerHeight
      window.scrollTo({
        top: rootRef.current.offsetTop + total * target,
        behavior: reducedMotion ? 'instant' : 'smooth',
      })
      window.history.replaceState(null, '', `#${id}`)
    },
    [reducedMotion]
  )
  useEffect(() => {
    const go = () => {
      const hash = window.location.hash.slice(1)
      const feature = FEATURE_BEATS.find((b) => b.id === hash)
      if (NAV_POINTS[hash] != null || feature)
        navigate(
          hash,
          feature
            ? feature.id === 'customize'
              ? feature.end - 0.004
              : feature.start + 0.023
            : undefined
        )
    }
    // A preference change replaces navigate, but must not replay the URL hash.
    const frame = initialHashHandled.current
      ? null
      : requestAnimationFrame(() => {
          initialHashHandled.current = true
          go()
        })
    window.addEventListener('hashchange', go)
    return () => {
      if (frame !== null) cancelAnimationFrame(frame)
      window.removeEventListener('hashchange', go)
    }
  }, [navigate])
  const qa = import.meta.env.DEV && new URLSearchParams(window.location.search).has('scene-qa')
  return (
    <TimelineProvider
      scrollProgress={scrollYProgress}
      navigate={navigate}
      reducedOverride={reducedPreview}
      previs={previs}
    >
      <main ref={rootRef} className="deck-journey" style={{ height: `${SCROLL_VH + 100}vh` }}>
        <div className="deck-atmosphere" />
        <Suspense
          fallback={
            <div className="deck-loading" role="status">
              Preparing your deck…
            </div>
          }
        >
          <LandingCanvas previs={previs} />
        </Suspense>
        <TopNav activeSection={activeSection} onNavigate={(i) => navigate(PHASE_ORDER[i])} />
        {PHASE_ORDER.map((id) => (
          <div
            key={id}
            id={id}
            className="deck-anchor"
            style={{ top: `${PHASES[id][0] * SCROLL_VH}vh` }}
          />
        ))}
        {!previs && (
          <>
            <HeroSection />
            <AboutSection />
            <HowItWorksSection />
            <FeaturesSection />
            <ContactSection />
          </>
        )}
        {previs && (
          <Suspense fallback={null}>
            <PrevisOverlay
              reduced={reducedPreview}
              onReduced={setReducedPreview}
              onSeek={(p) =>
                window.scrollTo({
                  top:
                    rootRef.current.offsetTop +
                    (rootRef.current.offsetHeight - window.innerHeight) * p,
                  behavior: 'instant',
                })
              }
            />
          </Suspense>
        )}
        <div className="deck-scroll-cue" aria-hidden="true">
          <span>
            {activeSection === 4 ? 'YOUR GAMES. YOUR NEXT CHAPTER.' : 'SCROLL TO EXPLORE'}
          </span>
          <i />
        </div>
        <div className="deck-chapter-count" aria-hidden="true">
          0{activeSection + 1}
          <span> / 05</span>
        </div>
        {qa && (
          <div className="deck-qa">
            <label htmlFor="scene-landmark">Scene landmark</label>
            <select
              id="scene-landmark"
              defaultValue=""
              onChange={(e) => {
                const p = QA_POINTS[e.target.value]
                const total = rootRef.current.offsetHeight - window.innerHeight
                window.scrollTo({ top: total * p, behavior: 'instant' })
              }}
            >
              <option value="" disabled>
                Choose frame
              </option>
              {Object.keys(QA_POINTS).map((k) => (
                <option key={k}>{k}</option>
              ))}
            </select>
            <label>
              <input
                type="checkbox"
                checked={reducedPreview}
                onChange={(e) => setReducedPreview(e.target.checked)}
              />
              Reduced motion preview
            </label>
          </div>
        )}
      </main>
    </TimelineProvider>
  )
}
