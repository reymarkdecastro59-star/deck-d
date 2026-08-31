import { CognitoUserPool, CognitoUser, AuthenticationDetails } from 'amazon-cognito-identity-js'

const userPool = new CognitoUserPool({
  UserPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
  ClientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
  Storage: window.sessionStorage,
})

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
  sessionStorage.removeItem('id_token')
  sessionStorage.removeItem('refresh_token')
  sessionStorage.removeItem('email')
  const current = userPool.getCurrentUser()
  if (current) current.signOut()
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
