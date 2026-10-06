// DEV-ONLY: the onboarding download step with sample /devices data.
import { useState } from 'react'
import { DownloadStep } from '@/app/onboarding/steps/DownloadStep'
import { getOnboardingState } from '@/app/onboarding/state'

if (typeof window !== 'undefined') window.__DECKD_MOCK_API__ = true

if (typeof window !== 'undefined') window.__DECKD_MOCK_API__ = true

export default function DownloadStepPreview() {
  const [state, setState] = useState(() => getOnboardingState())
  return (
    <DownloadStep
      state={state}
      onChange={setState}
      onNext={() => {}}
      onBack={() => {}}
      stepIdx={2}
      totalSteps={4}
    />
  )
}
