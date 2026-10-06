// Onboarding state — client-side only until backend persistence exists.
// TODO(backend): move to a POST /profile/onboarding endpoint that stores
// consent version + survey answers + tracker acknowledgement on the user record.

const STORAGE_KEY = 'deckd.onboarding'
export const CONSENT_VERSION = '1.0'

const EMPTY = Object.freeze({
  completedAt: null,
  consentVersion: null,
  consent: { tos: false, privacy: false, telemetry: false },
  survey: { playstyles: [], genres: [], weeklyBudget: null },
  tracker: { acknowledged: false, os: null },
})

export function getOnboardingState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...EMPTY }
    const parsed = JSON.parse(raw)
    return { ...EMPTY, ...parsed }
  } catch {
    return { ...EMPTY }
  }
}

export function saveOnboardingState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* storage disabled */
  }
}

export function isOnboardingComplete() {
  const s = getOnboardingState()
  return Boolean(s.completedAt) && s.consentVersion === CONSENT_VERSION
}

export function completeOnboarding(state) {
  const next = {
    ...state,
    completedAt: new Date().toISOString(),
    consentVersion: CONSENT_VERSION,
  }
  saveOnboardingState(next)
  return next
}

export function resetOnboarding() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* storage disabled */
  }
}
