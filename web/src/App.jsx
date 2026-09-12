import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import LandingRedesign from '@/pages/landing/redesign/Landing'
import Login from '@/pages/login/Login'
import Dashboard from '@/pages/dashboard/Dashboard'
import { AuthProvider, ProtectedRoute } from '@/auth/AuthContext'
import { AppShell } from '@/app/shell'
import { Onboarding, OnboardingGuard } from '@/app/onboarding'
import { ErrorBoundary } from '@/app/ErrorBoundary'
import { OfflineBanner } from '@/app/OfflineBanner'
import NotFound from '@/app/NotFound'
import { Skeleton } from '@/app/ui/Skeleton'

// Route-level code splitting: Dashboard is on the critical path (post-login
// landing) so it stays in the main chunk. Everything else is only loaded when
// the user actually navigates to it. Stats + Recommendations were the heaviest
// pages in the eager bundle — Stats pulls in aggregations + all viz primitives.
const Library = lazy(() => import('@/pages/library/Library'))
const GameDetail = lazy(() => import('@/pages/library/GameDetail'))
const Sessions = lazy(() => import('@/pages/sessions/Sessions'))
const Recommendations = lazy(() => import('@/pages/recommendations/Recommendations'))
const Stats = lazy(() => import('@/pages/stats/Stats'))
const Devices = lazy(() => import('@/pages/devices/Devices'))
const Settings = lazy(() => import('@/pages/settings/Settings'))
const Terms = lazy(() => import('@/pages/legal/Terms'))
const Privacy = lazy(() => import('@/pages/legal/Privacy'))

function ProtectedShell() {
  return (
    <ProtectedRoute>
      <OnboardingGuard>
        <AppShell />
      </OnboardingGuard>
    </ProtectedRoute>
  )
}

// Fallback that appears while a lazy chunk loads. Matches the surrounding
// page padding so route transitions don't jump layout.
function RouteFallback() {
  return (
    <div className="mx-auto max-w-[1280px] space-y-4 px-8 py-8">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-40 w-full" />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <OfflineBanner />
        <ErrorBoundary>
          <Suspense fallback={<RouteFallback />}>
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
          </Suspense>
        </ErrorBoundary>
      </AuthProvider>
    </BrowserRouter>
  )
}
