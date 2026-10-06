import { Navigate, useLocation } from 'react-router-dom'
import { completeOnboarding, getOnboardingState, isOnboardingComplete } from './state'
import { useConnectedTracker } from './useConnectedTracker'

/**
 * Wraps authenticated routes. If the user hasn't finished onboarding,
 * redirect them to /onboarding. Anything past /onboarding renders normally.
 *
 * Completion used to live only in this browser's localStorage, so a new
 * browser, cleared storage or a different origin (localhost vs 127.0.0.1)
 * sent an established account back through onboarding. Before redirecting
 * we ask the server: an account that already has a connected tracker has
 * been set up, so it goes straight in.
 */
export function OnboardingGuard({ children }) {
  const { pathname } = useLocation()
  const locallyComplete = pathname.startsWith('/onboarding') || isOnboardingComplete()
  const { device, checked } = useConnectedTracker({ intervalMs: 0, enabled: !locallyComplete })

  if (locallyComplete) return children
  if (!checked) return null // one quick /devices call; avoids flashing onboarding
  if (device) {
    const s = getOnboardingState()
    completeOnboarding({ ...s, tracker: { ...s.tracker, acknowledged: true } })
    return children
  }
  return <Navigate to="/onboarding" replace />
}
