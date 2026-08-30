import { createContext, useCallback, useContext, useState } from 'react'
import { Navigate } from 'react-router-dom'
import * as cognito from './cognito'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [email, setEmail] = useState(cognito.getEmail())

  const login = useCallback(async (emailInput, password) => {
    const result = await cognito.login(emailInput, password)
    setEmail(result.email)
  }, [])

  const logout = useCallback(() => {
    cognito.logout()
    setEmail(null)
  }, [])

  return (
    <AuthContext.Provider value={{ email, isAuthenticated: !!email, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}

export function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return children
}
