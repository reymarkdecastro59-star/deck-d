import { createContext, useContext, useState } from 'react'
import { motion, useMotionValueEvent, useTransform } from 'motion/react'
import { useMasterTimeline } from '../hooks/useMasterTimeline'
import { SECTION_FADES, interval } from '../hooks/timelinePhases'
import './deck-sections.css'
const ChapterContext = createContext('home')
export function SectionMarker({ number, label }) {
  return (
    <p className="deck-section__marker">
      {String(number).padStart(2, '0')} <span> / </span> {label}
    </p>
  )
}
export function Reveal({ children, at, end, direction = 'up', className = '' }) {
  const { sceneProgress: scrollProgress, reducedMotion } = useMasterTimeline()
  const key = useContext(ChapterContext)
  const [a, b, c, d] = SECTION_FADES[key]
  const start = at ?? a,
    finish = end ?? Math.max(b, start + 0.008)
  const progress = useTransform(scrollProgress, (p) =>
    key === 'home' && at == null ? 1 : interval(p, start, finish)
  )
  const y = useTransform(progress, (t) => (reducedMotion || direction !== 'up' ? 0 : (1 - t) * 30))
  const x = useTransform(progress, (t) =>
    reducedMotion || direction !== 'right' ? 0 : (1 - t) * 28
  )
  const opacity = useTransform(scrollProgress, (p) => {
    const enter = key === 'home' && at == null ? 1 : interval(p, start, finish)
    const exit = key === 'contact' ? 0 : interval(p, c, d)
    return enter * (1 - exit)
  })
  return (
    <motion.span className={`deck-reveal ${className}`} style={{ opacity }}>
      <motion.span style={{ x, y }}>{children}</motion.span>
    </motion.span>
  )
}
export function SectionHeading({ children, lines, times, as: Tag = 'h2' }) {
  return (
    <Tag className="deck-section__heading">
      {lines
        ? lines.map((line, i) => (
            <Reveal
              key={line}
              at={times?.[i]}
              end={times?.[i] != null ? times[i] + 0.009 : undefined}
            >
              {line}
            </Reveal>
          ))
        : children}
    </Tag>
  )
}
export function SectionDeck({ children }) {
  return <p className="deck-section__deck">{children}</p>
}
export function SectionScaffold({ sectionKey, id, ariaLabel, detail = false, children }) {
  const { sceneProgress: scrollProgress } = useMasterTimeline()
  const [a, , , d] = SECTION_FADES[sectionKey]
  const isActive = (p) => p >= a && (sectionKey === 'contact' || p < d)
  const [active, setActive] = useState(() => isActive(scrollProgress.get()))
  useMotionValueEvent(scrollProgress, 'change', (p) => {
    const next = isActive(p)
    setActive((prev) => (prev === next ? prev : next))
  })
  return (
    <ChapterContext.Provider value={sectionKey}>
      <div
        className={`deck-section deck-section--${sectionKey}${detail ? ' is-detail' : ''}`}
        data-section-id={id}
        role="region"
        aria-label={ariaLabel}
        aria-hidden={!active}
        inert={!active}
        style={{ visibility: active ? 'visible' : 'hidden' }}
      >
        <div className="deck-section__content">{children}</div>
      </div>
    </ChapterContext.Provider>
  )
}
