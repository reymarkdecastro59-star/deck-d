import { motion, useTransform } from 'motion/react'
import { SectionDeck, SectionMarker, SectionScaffold, Reveal } from './_typography'
import { useMasterTimeline } from '../hooks/useMasterTimeline'
import { interval } from '../hooks/timelinePhases'
const stages = [
  {
    at: 0.335,
    end: 0.395,
    lines: ['Track what', 'you play.'],
    copy: 'From the first launch to the last session. Your play history, brought together.',
  },
  {
    at: 0.407,
    end: 0.475,
    lines: ['Understand', 'your habits.'],
    copy: 'Your genres, your rhythm, your favorites. Find the patterns behind your play.',
  },
  {
    at: 0.488,
    end: 0.615,
    lines: ['Find what', 'fits next.'],
    copy: 'Turn the games you love into a more personal next recommendation.',
  },
]
function Stage({ stage, index }) {
  const { sceneProgress: scrollProgress, reducedMotion } = useMasterTimeline()
  const y = useTransform(scrollProgress, (p) =>
    reducedMotion
      ? 0
      : 32 * (1 - interval(p, stage.at, stage.at + 0.013)) -
        140 * interval(p, stage.end, stage.end + 0.012)
  )
  const clipPath = useTransform(
    scrollProgress,
    (p) => `inset(0 0 ${100 * (1 - interval(p, stage.at, stage.at + 0.013))}% 0)`
  )
  const visibility = useTransform(scrollProgress, (p) =>
    p >= stage.at && p < stage.end + 0.012 ? 'visible' : 'hidden'
  )
  return (
    <motion.div className="deck-process-copy" style={{ visibility, clipPath }}>
      <motion.div style={{ y }}>
        <p className="deck-step">0{index + 1} / 03</p>
        <h2 className="deck-section__heading">
          {stage.lines.map((l) => (
            <span key={l} className="deck-reveal">
              {l}
            </span>
          ))}
        </h2>
        <SectionDeck>{stage.copy}</SectionDeck>
      </motion.div>
    </motion.div>
  )
}
export default function HowItWorksSection() {
  return (
    <SectionScaffold sectionKey="how" id="how" ariaLabel="How it works">
      <SectionMarker number={3} label="HOW IT WORKS" />
      <div className="deck-process-window">
        {stages.map((s, i) => (
          <Stage key={s.at} stage={s} index={i} />
        ))}
      </div>
      <Reveal at={0.39} end={0.4}>
        <p className="deck-process-trail">
          Track <span>→</span> Understand <span>→</span> Recommend
        </p>
      </Reveal>
    </SectionScaffold>
  )
}
