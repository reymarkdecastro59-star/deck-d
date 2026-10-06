import { useState } from 'react'
import { motion, useMotionValueEvent, useTransform } from 'motion/react'
import { Layers, ChartNoAxesCombined, Sparkles, Orbit, PanelsTopLeft } from 'lucide-react'
import { SectionDeck, SectionHeading, SectionMarker, SectionScaffold } from './_typography'
import { useMasterTimeline } from '../hooks/useMasterTimeline'
import { FEATURE_BEATS, featureLifecycle } from '../hooks/timelinePhases'
const icons = [Layers, ChartNoAxesCombined, Sparkles, Orbit, PanelsTopLeft]
function FeatureCopy({ beat, index, active }) {
  const { sceneProgress, reducedMotion } = useMasterTimeline()
  const opacity = useTransform(sceneProgress, (p) => featureLifecycle(p, index).opacity)
  const y = useTransform(sceneProgress, (p) => {
    const state = featureLifecycle(p, index)
    return reducedMotion ? 0 : (1 - state.opacity) * (state.phase === 'EXIT' ? -8 : 8)
  })
  return (
    <motion.div
      className="deck-feature-caption"
      aria-hidden={!active}
      style={{ visibility: active ? 'visible' : 'hidden', opacity, y }}
    >
      <h3>
        {beat.lines.map((line) => (
          <span key={line}>{line}</span>
        ))}
      </h3>
      <p>{beat.copy}</p>
    </motion.div>
  )
}
export default function FeaturesSection() {
  const { sceneProgress, navigate } = useMasterTimeline()
  const current = (p) => FEATURE_BEATS.findIndex((b) => p >= b.start && p < b.end)
  const [index, setIndex] = useState(() => current(sceneProgress.get()))
  useMotionValueEvent(sceneProgress, 'change', (p) => setIndex(current(p)))
  return (
    <SectionScaffold sectionKey="features" id="features" ariaLabel="Features" detail={index >= 0}>
      <SectionMarker number={4} label="FEATURES" />
      <div className="deck-feature-intro">
        <SectionHeading lines={['A dashboard', 'that respects', 'your attention.']} />
        <SectionDeck>Everything you need, nothing you don’t.</SectionDeck>
      </div>
      <div className="deck-feature-list">
        {FEATURE_BEATS.map((b, i) => {
          const Icon = icons[i]
          return (
            <button
              key={b.id}
              aria-current={index === i ? 'step' : undefined}
              onClick={() => navigate(b.id, (b.start + b.end) / 2)}
            >
              <Icon size={19} strokeWidth={1.25} />
              <span>
                <strong>
                  <span className="deck-feature-label-long">{b.title}</span>
                  <span className="deck-feature-label-short" aria-hidden="true">
                    {['Library', 'Playtime', 'For you', 'Platforms', 'Layout'][i]}
                  </span>
                </strong>
                <small>{b.copy}</small>
              </span>
              <i>0{i + 1}</i>
            </button>
          )
        })}
      </div>
      <div className="deck-feature-caption-window">
        {FEATURE_BEATS.map((b, i) => (
          <FeatureCopy key={b.id} beat={b} index={i} active={index === i} />
        ))}
      </div>
    </SectionScaffold>
  )
}
