import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserAttribute,
  CognitoRefreshToken,
} from 'amazon-cognito-identity-js'
import { isExpiringSoon } from '@/lib/jwt'

const userPool = new CognitoUserPool({
  UserPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
  ClientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
  Storage: window.sessionStorage,
})

// SDK-managed key prefix — used to sweep leftover tokens on logout.
// See amazon-cognito-identity-js internals: keys are stored as
// CognitoIdentityServiceProvider.<clientId>.<username>.<tokenKind>.
const SDK_KEY_PREFIX = 'CognitoIdentityServiceProvider.'

// Hold the CognitoUser reference from login so logout can always call
// signOut() on the exact instance, not depend on pool.getCurrentUser()
// (which returns null when the SDK's own state is out of sync).
let activeUser = null

export function login(email, password) {
  return new Promise((resolve, reject) => {
    const authDetails = new AuthenticationDetails({
      Username: email,
      Password: password,
    })
    const cognitoUser = new CognitoUser({
      Username: email,
      Pool: userPool,
      Storage: window.sessionStorage,
    })
    cognitoUser.authenticateUser(authDetails, {
      onSuccess: (session) => {
        activeUser = cognitoUser
        const idToken = session.getIdToken().getJwtToken()
        const refreshToken = session.getRefreshToken().getToken()
        sessionStorage.setItem('id_token', idToken)
        sessionStorage.setItem('refresh_token', refreshToken)
        sessionStorage.setItem('email', email)
        resolve({ idToken, email })
      },
      onFailure: (err) => reject(err),
    })
  })
}

// Self-signup: creates the user with an email attribute and asks Cognito
// to send a 6-digit verification code. The pool must have
// AutoVerifiedAttributes: [email] (see template.yaml) — otherwise the code
// email never sends. Resolves with the username Cognito assigned so the
// confirm screen can echo it back.
export function signUp(email, password) {
  return new Promise((resolve, reject) => {
    const attrs = [new CognitoUserAttribute({ Name: 'email', Value: email })]
    userPool.signUp(email, password, attrs, null, (err, result) => {
      if (err) return reject(err)
      resolve({ username: result.user.getUsername(), userConfirmed: result.userConfirmed })
    })
  })
}

export function confirmSignUp(email, code) {
  return new Promise((resolve, reject) => {
    const user = new CognitoUser({ Username: email, Pool: userPool })
    user.confirmRegistration(code, true, (err) => {
      if (err) return reject(err)
      resolve()
    })
  })
}

export function resendConfirmationCode(email) {
  return new Promise((resolve, reject) => {
    const user = new CognitoUser({ Username: email, Pool: userPool })
    user.resendConfirmationCode((err) => {
      if (err) return reject(err)
      resolve()
    })
  })
}

export function logout() {
  // 1. Wipe the app's flat keys (what apiFetch reads).
  sessionStorage.removeItem('id_token')
  sessionStorage.removeItem('refresh_token')
  sessionStorage.removeItem('email')

  // 2. Call signOut on the tracked user first — reliable when we hold a
  //    reference from login. Fall back to whatever getCurrentUser returns
  //    (e.g. on page refresh where activeUser is null).
  const user = activeUser || userPool.getCurrentUser()
  if (user) user.signOut()
  activeUser = null

  // 3. Safety net: sweep any SDK-managed keys the SDK left behind. Prevents
  //    stale tokens from surviving a partial logout where signOut() no-ops.
  for (let i = sessionStorage.length - 1; i >= 0; i--) {
    const key = sessionStorage.key(i)
    if (key && key.startsWith(SDK_KEY_PREFIX)) sessionStorage.removeItem(key)
  }
}

export function getIdToken() {
  return sessionStorage.getItem('id_token')
}

// One refresh at a time: a page fires several API calls at once, and they
// must all wait on the same refresh rather than each spending the token.
let refreshing = null

/**
 * A usable ID token, refreshed first if it expires within 2 minutes.
 * Cognito ID tokens last 1 hour; the refresh token was stored at login but
 * never used, so after an hour every request failed (and the gateway's
 * CORS-less 401 surfaced as "Failed to fetch"). Resolves null when there is
 * no session or the refresh token itself is rejected — callers then sign out.
 */
export async function getValidIdToken() {
  const current = sessionStorage.getItem('id_token')
  if (!current) return null
  if (!isExpiringSoon(current)) return current
  if (!refreshing) {
    refreshing = refreshIdToken().finally(() => {
      refreshing = null
    })
  }
  return refreshing
}

function refreshIdToken() {
  const refreshToken = sessionStorage.getItem('refresh_token')
  const email = sessionStorage.getItem('email')
  if (!refreshToken || !email) return Promise.resolve(null)
  return new Promise((resolve) => {
    const user = new CognitoUser({
      Username: email,
      Pool: userPool,
      Storage: window.sessionStorage,
    })
    user.refreshSession(new CognitoRefreshToken({ RefreshToken: refreshToken }), (err, session) => {
      if (err || !session) return resolve(null)
      const idToken = session.getIdToken().getJwtToken()
      sessionStorage.setItem('id_token', idToken)
      activeUser = user
      resolve(idToken)
    })
  })
}

export function getEmail() {
  return sessionStorage.getItem('email')
}

export function isAuthenticated() {
  return !!sessionStorage.getItem('id_token')
}
