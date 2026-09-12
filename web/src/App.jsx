import { BrowserRouter, Route, Routes } from 'react-router-dom'
import LandingRedesign from '@/pages/landing/redesign/Landing'
import Login from '@/pages/login/Login'
import Dashboard from '@/pages/dashboard/Dashboard'
import { Library, GameDetail } from '@/pages/library'
import { Sessions } from '@/pages/sessions'
import { Recommendations } from '@/pages/recommendations'
import { Stats } from '@/pages/stats'
import { Devices } from '@/pages/devices'
import { Settings } from '@/pages/settings'
import { AuthProvider, ProtectedRoute } from '@/auth/AuthContext'
import { AppShell } from '@/app/shell'
import { Onboarding, OnboardingGuard } from '@/app/onboarding'

function ProtectedShell() {
  return (
    <ProtectedRoute>
      <OnboardingGuard>
        <AppShell />
      </OnboardingGuard>
    </ProtectedRoute>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingRedesign />} />
          <Route path="/preview" element={<LandingRedesign />} />
          <Route path="/login" element={<Login />} />

          {/* First-run flow — protected but sits outside the AppShell chrome. */}
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute>
                <Onboarding />
              </ProtectedRoute>
            }
          />

          {/* Authenticated app — everything nested here renders inside AppShell,
              gated by OnboardingGuard so unfinished users get bounced to /onboarding. */}
          <Route element={<ProtectedShell />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/library" element={<Library />} />
            <Route path="/library/:key" element={<GameDetail />} />
            <Route path="/sessions" element={<Sessions />} />
            <Route path="/recommendations" element={<Recommendations />} />
            <Route path="/stats" element={<Stats />} />
            <Route path="/devices" element={<Devices />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
