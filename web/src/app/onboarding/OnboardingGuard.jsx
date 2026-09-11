import { Navigate, useLocation } from 'react-router-dom'
import { isOnboardingComplete } from './state'

/**
 * Wraps authenticated routes. If the user hasn't finished onboarding,
 * redirect them to /onboarding. Anything past /onboarding renders normally.
 */
export function OnboardingGuard({ children }) {
  const { pathname } = useLocation()
  if (pathname.startsWith('/onboarding')) return children
  if (!isOnboardingComplete()) return <Navigate to="/onboarding" replace />
  return children
}
