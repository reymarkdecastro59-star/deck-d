import { createContext, useContext, useMemo, useEffect } from 'react'
import { animate, useMotionValue } from 'motion/react'
import { useMotionPreference } from './useMotionPreference'
import { FEATURE_BEATS } from './timelinePhases'
import { previsShot } from '../canvas/previsShots'
const TimelineContext = createContext(null)
export function TimelineProvider({
  scrollProgress,
  navigate,
  reducedOverride = false,
  previs = false,
  children,
}) {
  const preference = useMotionPreference()
  const reducedMotion = preference || reducedOverride
  const intro = useMotionValue(0)
  useEffect(() => {
    const animation = animate(intro, 1, {
      duration: reducedMotion ? 0 : 1.6,
      ease: [0.22, 1, 0.36, 1],
    })
    return () => animation.stop()
  }, [intro, reducedMotion])
  const sceneProgress = useMotionValue(scrollProgress.get())
  useEffect(() => {
    const update = (p = scrollProgress.get()) => {
      if (!reducedMotion) return sceneProgress.set(p)
      const feature = FEATURE_BEATS.find((b) => p >= b.start && p < b.end)
      sceneProgress.set(feature && !previs ? (feature.start + feature.end) / 2 : previsShot(p).p)
    }
    // Recompute even while stationary when the accessibility preference changes.
    update()
    return scrollProgress.on('change', update)
  }, [scrollProgress, reducedMotion, sceneProgress, previs])
  const value = useMemo(
    () => ({ scrollProgress, sceneProgress, intro, navigate, reducedMotion }),
    [scrollProgress, sceneProgress, intro, navigate, reducedMotion]
  )
  return <TimelineContext.Provider value={value}>{children}</TimelineContext.Provider>
}
// oxlint-disable-next-line react/only-export-components -- Shared context hook is intentionally colocated.
export function useMasterTimeline() {
  const value = useContext(TimelineContext)
  if (!value) throw new Error('Landing timeline provider missing')
  return value
}
