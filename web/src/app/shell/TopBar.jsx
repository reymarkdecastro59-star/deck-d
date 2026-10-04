import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { Wordmark } from '@/app/ui/brand'
import { Search } from 'lucide-react'
import { IconButton } from '@/app/ui/IconButton'
import { GlobalSearch } from './GlobalSearch'
import { useGlobalSearchShortcut } from './useGlobalSearchShortcut'
import { NotificationsMenu } from './NotificationsMenu'
import { UserMenu } from './UserMenu'
import { SyncStatus } from './SyncStatus'

export function TopBar() {
  const [searchOpen, setSearchOpen] = useState(false)
  const openSearch = useCallback(() => setSearchOpen(true), [])
  const closeSearch = useCallback(() => setSearchOpen(false), [])
  useGlobalSearchShortcut(openSearch)

  // Detect the correct shortcut hint for the platform so we don't lie to
  // Windows/Linux users about ⌘. The shortcut hook accepts both.
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform)

  return (
    <>
      <header
        className="relative flex shrink-0 items-center gap-4 px-4 sm:px-8"
        style={{ height: 'var(--app-topbar-h)', zIndex: 'var(--app-z-topbar)' }}
      >
        {/* Left: intentionally empty. Page title lives in the page's own
            header (PageHeader) — repeating it in the top bar was noisy.
            Spacer keeps the search anchored to the right on wide screens. */}
        {/* Phones have no sidebar, so the wordmark lives here below md. */}
        <Link to="/dashboard" aria-label="DECK'D, Overview" className="inline-flex md:hidden">
          <Wordmark size={19} />
        </Link>
        <div className="flex-1" />

        {/* Global search — pill-shaped, elevated surface, hairline border
            only. Focus state uses the accent ring. */}
        <button
          type="button"
          onClick={openSearch}
          className="hidden h-11 min-w-[340px] items-center gap-2.5 rounded-[var(--app-r-2)] border border-[var(--app-border)] bg-[var(--app-bg-2)] px-4 text-[15px] text-[var(--app-fg-muted)] transition-colors [transition-duration:var(--app-dur-1)] hover:border-[var(--app-border-strong)] hover:text-[var(--app-fg)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-accent)] md:flex"
          aria-label="Open search"
        >
          <Search className="h-4 w-4 text-[var(--app-fg-muted)]" strokeWidth={1.75} />
          <span className="flex-1 text-left">Search games and sessions</span>
          <span className="app-num inline-flex items-center gap-1 text-[12px] text-[var(--app-fg-muted)]">
            <kbd className="rounded border border-[var(--app-hairline)] bg-[var(--app-bg-3)] px-1.5 py-0.5">
              {isMac ? '⌘' : 'Ctrl'}
            </kbd>
            <kbd className="rounded border border-[var(--app-hairline)] bg-[var(--app-bg-3)] px-1.5 py-0.5">
              K
            </kbd>
          </span>
        </button>

        <IconButton size="sm" label="Open search" className="md:hidden" onClick={openSearch}>
          <Search />
        </IconButton>

        <div className="flex items-center gap-2">
          <SyncStatus />
          <NotificationsMenu />
          <UserMenu />
        </div>
      </header>

      <GlobalSearch open={searchOpen} onClose={closeSearch} />
    </>
  )
}
