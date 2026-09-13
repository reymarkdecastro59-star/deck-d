import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

/**
 * Persistent authenticated shell: sidebar + top bar + scrollable main.
 * Sidebar has its own surface (bg-2). Main uses the base bg. No global
 * environment art here — pages that need atmospheric imagery own it in a
 * scoped hero band, so the shell stays lightweight for pages that don't.
 */
export function AppShell() {
  return (
    <div className="app-root flex min-h-dvh bg-[var(--app-bg)] text-[var(--app-fg)]">
      <a href="#app-main" className="app-skip-link">
        Skip to main content
      </a>
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main id="app-main" tabIndex={-1} className="relative flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
