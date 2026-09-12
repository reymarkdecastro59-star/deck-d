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
import { Terms, Privacy } from '@/pages/legal'
import { AuthProvider, ProtectedRoute } from '@/auth/AuthContext'
import { AppShell } from '@/app/shell'
import { Onboarding, OnboardingGuard } from '@/app/onboarding'
import { ErrorBoundary } from '@/app/ErrorBoundary'
import { OfflineBanner } from '@/app/OfflineBanner'
import NotFound from '@/app/NotFound'

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
        <OfflineBanner />
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<LandingRedesign />} />
            <Route path="/preview" element={<LandingRedesign />} />
            <Route path="/login" element={<Login />} />

            {/* Public legal pages — reachable from onboarding + landing footer + Settings. */}
            <Route path="/legal/terms" element={<Terms />} />
            <Route path="/legal/privacy" element={<Privacy />} />

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

            {/* Catch-all — must be last. Renders outside AppShell so it works
                for both marketing typos and app-route typos. */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </ErrorBoundary>
      </AuthProvider>
    </BrowserRouter>
  )
}
