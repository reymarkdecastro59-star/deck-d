import { CognitoUserPool, CognitoUser, AuthenticationDetails } from 'amazon-cognito-identity-js'

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

export function getEmail() {
  return sessionStorage.getItem('email')
}

export function isAuthenticated() {
  return !!sessionStorage.getItem('id_token')
}
