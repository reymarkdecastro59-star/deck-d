import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { BottomNav } from './BottomNav'
import { TrackingProvider } from './TrackingProvider'

/**
 * Persistent authenticated shell: sidebar + top bar + scrollable main.
 * Sidebar has its own surface (bg-2). Main uses the base bg. No global
 * environment art here — pages that need atmospheric imagery own it in a
 * scoped hero band, so the shell stays lightweight for pages that don't.
 *
 * Below md the sidebar is hidden and a persistent BottomNav is shown; main
 * gets bottom padding equal to the tab bar height so fixed content never
 * clips the last row on phone.
 */
export function AppShell() {
  return (
    <TrackingProvider>
      <div className="app-root flex min-h-dvh bg-[var(--app-bg)] text-[var(--app-fg)]">
        <a href="#app-main" className="app-skip-link">
          Skip to main content
        </a>
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar />
          <main
            id="app-main"
            tabIndex={-1}
            className="relative flex-1 overflow-y-auto pb-[calc(60px+env(safe-area-inset-bottom,0px))] md:pb-0"
          >
            <Outlet />
          </main>
        </div>
        <BottomNav />
      </div>
    </TrackingProvider>
  )
}
