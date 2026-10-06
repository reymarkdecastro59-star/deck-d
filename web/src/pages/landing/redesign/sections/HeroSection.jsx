import { motion, useTransform } from 'motion/react'
import { SectionDeck, SectionMarker, SectionScaffold, Reveal } from './_typography'
import { useMasterTimeline } from '../hooks/useMasterTimeline'
import { interval } from '../hooks/timelinePhases'
function Intro({ children, start, end }) {
  const { intro, reducedMotion } = useMasterTimeline()
  const y = useTransform(intro, (t) => (reducedMotion ? 0 : 26 * (1 - interval(t, start, end))))
  const clipPath = useTransform(
    intro,
    (t) => `inset(0 0 ${100 * (1 - interval(t, start, end))}% 0)`
  )
  return (
    <motion.div className="deck-reveal" style={{ clipPath }}>
      <motion.div style={{ y }}>{children}</motion.div>
    </motion.div>
  )
}
export default function HeroSection() {
  const { navigate } = useMasterTimeline()
  return (
    <SectionScaffold sectionKey="home" id="home" ariaLabel="Home">
      <SectionMarker number={1} label="HOME" />
      <h1 className="deck-section__heading">
        <Intro start={0} end={0.45}>
          <Reveal>Every game.</Reveal>
        </Intro>
        <Intro start={0.4} end={0.78}>
          <Reveal>One deck.</Reveal>
        </Intro>
      </h1>
      <Intro start={0.68} end={0.9}>
        <Reveal>
          <SectionDeck>
            Bring your library into one place.
            <br />
            Track, understand, and get recommendations
            <br className="desktop-break" /> that actually fit you.
          </SectionDeck>
        </Reveal>
      </Intro>
      <Intro start={0.84} end={1}>
        <Reveal>
          <div className="deck-section__cta">
            <a
              href="#contact"
              onClick={(e) => {
                e.preventDefault()
                navigate('contact')
              }}
            >
              Get Early Access
            </a>
            <a
              className="deck-section__cta--secondary"
              href="#how"
              onClick={(e) => {
                e.preventDefault()
                navigate('how')
              }}
            >
              See how it works <span aria-hidden="true">↗</span>
            </a>
          </div>
        </Reveal>
      </Intro>
    </SectionScaffold>
  )
}
