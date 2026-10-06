import { motion } from 'motion/react'
import { Check } from 'lucide-react'
import { Button } from '@/app/ui/Button'
import { OnboardingLayout } from '../OnboardingLayout'

export function CompleteStep({ onNext, onBack, stepIdx, totalSteps }) {
  return (
    <OnboardingLayout
      stepIdx={stepIdx}
      totalSteps={totalSteps}
      eyebrow="Step 4 of 4"
      title="You're set"
      lede="Your dashboard is quiet for now — that's expected. Play a session, and DECK'D will start telling your story."
      footer={
        <>
          <Button variant="quiet" onClick={onBack}>
            Back
          </Button>
          <Button variant="primary" onClick={onNext}>
            Open dashboard
          </Button>
        </>
      }
    >
      <div className="mt-4 flex flex-col items-center py-12 text-center">
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.36, ease: [0.2, 0.7, 0.2, 1] }}
          className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-[var(--app-accent-rail)] bg-[var(--app-accent-tint)]"
        >
          <Check className="h-9 w-9 text-[var(--app-accent-hi)]" strokeWidth={2} />
        </motion.div>
        <p className="max-w-[440px] text-[15px] text-[var(--app-fg)]">
          When you install the tracker, sessions land in your library and dashboard automatically.
          Until then, everything is calm — no fake data, no misleading numbers.
        </p>
      </div>
    </OnboardingLayout>
  )
}
