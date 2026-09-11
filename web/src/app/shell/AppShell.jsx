import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

/**
 * Persistent authenticated shell: fixed sidebar + top bar, scrollable main.
 * Renders any nested route inside its <Outlet />.
 */
export function AppShell() {
  return (
    <div className="app-root flex min-h-dvh bg-[var(--app-bg)] text-[var(--app-fg)]">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
