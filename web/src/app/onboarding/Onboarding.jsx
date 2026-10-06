import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import {
  completeOnboarding,
  getOnboardingState,
  isOnboardingComplete,
  saveOnboardingState,
} from './state'
import { ConsentStep } from './steps/ConsentStep'
import { SurveyStep } from './steps/SurveyStep'
import { DownloadStep } from './steps/DownloadStep'
import { CompleteStep } from './steps/CompleteStep'

const STEPS = [
  { key: 'consent', Component: ConsentStep },
  { key: 'survey', Component: SurveyStep },
  { key: 'download', Component: DownloadStep },
  { key: 'complete', Component: CompleteStep },
]

export default function Onboarding() {
  const navigate = useNavigate()
  const [state, setState] = useState(() => getOnboardingState())
  const [stepIdx, setStepIdx] = useState(0)

  // If they've already finished, don't trap them here.
  useEffect(() => {
    if (isOnboardingComplete()) navigate('/dashboard', { replace: true })
  }, [navigate])

  // Persist survey/consent drafts as the user goes, so a refresh doesn't wipe them.
  useEffect(() => {
    saveOnboardingState(state)
  }, [state])

  const step = STEPS[stepIdx]
  const total = STEPS.length

  const goNext = () => {
    if (stepIdx < total - 1) {
      setStepIdx((i) => i + 1)
      return
    }
    // Last step: finalize and redirect.
    completeOnboarding(state)
    navigate('/dashboard', { replace: true })
  }

  const goBack = stepIdx > 0 ? () => setStepIdx((i) => i - 1) : undefined

  const StepComponent = step.Component

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={step.key}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.22, ease: [0.2, 0.7, 0.2, 1] }}
      >
        <StepComponent
          state={state}
          onChange={setState}
          onNext={goNext}
          onBack={goBack}
          stepIdx={stepIdx}
          totalSteps={total}
        />
      </motion.div>
    </AnimatePresence>
  )
}
