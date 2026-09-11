import { useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Bell, Search } from 'lucide-react'
import { IconButton } from '@/app/ui/IconButton'
import { GlobalSearch } from './GlobalSearch'
import { useGlobalSearchShortcut } from './useGlobalSearchShortcut'
import { UserMenu } from './UserMenu'

const TITLES = [
  { match: /^\/dashboard/, title: 'Dashboard' },
  { match: /^\/library/, title: 'Library' },
  { match: /^\/sessions/, title: 'Sessions' },
  { match: /^\/recommendations/, title: 'Recommendations' },
  { match: /^\/stats/, title: 'Stats' },
  { match: /^\/devices/, title: 'Devices' },
  { match: /^\/settings\/devices/, title: 'Devices' },
  { match: /^\/settings/, title: 'Settings' },
]

function resolveTitle(pathname) {
  const hit = TITLES.find((t) => t.match.test(pathname))
  return hit?.title ?? ''
}

export function TopBar() {
  const [searchOpen, setSearchOpen] = useState(false)
  useGlobalSearchShortcut(() => setSearchOpen(true))
  const { pathname } = useLocation()
  const title = useMemo(() => resolveTitle(pathname), [pathname])

  return (
    <>
      <header
        className="flex shrink-0 items-center gap-3 border-b border-[var(--app-border)] bg-[var(--app-bg)] px-6"
        style={{ height: 'var(--app-topbar-h)', zIndex: 'var(--app-z-topbar)' }}
      >
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[15px] font-medium text-[var(--app-fg)]">{title}</h1>
        </div>

        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="hidden h-9 min-w-[260px] items-center gap-2 rounded-[var(--app-r-2)] border border-[var(--app-border)] bg-[var(--app-bg-2)] px-3 text-[13px] text-[var(--app-fg-muted)] transition-colors [transition-duration:var(--app-dur-1)] hover:border-[var(--app-border-strong)] hover:bg-[var(--app-bg-3)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-accent)] md:flex"
        >
          <Search className="h-4 w-4" strokeWidth={1.75} />
          <span className="flex-1 text-left">Search games, sessions…</span>
          <kbd className="app-num rounded border border-[var(--app-border)] bg-[var(--app-bg-3)] px-1.5 py-0.5 text-[11px]">
            ⌘K
          </kbd>
        </button>

        <IconButton
          size="sm"
          label="Open search"
          className="md:hidden"
          onClick={() => setSearchOpen(true)}
        >
          <Search />
        </IconButton>

        <IconButton size="sm" label="Notifications">
          <Bell />
        </IconButton>

        <UserMenu />
      </header>

      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  )
}
