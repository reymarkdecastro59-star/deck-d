import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { LogOut, Settings as SettingsIcon, User as UserIcon } from 'lucide-react'
import { useAuth } from '@/auth/AuthContext'
import { cn } from '@/app/ui/cn'

function initial(email) {
  if (!email) return '?'
  return email.charAt(0).toUpperCase()
}

export function UserMenu() {
  const { email, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const navigate = useNavigate()
  const reduce = useReducedMotion()

  useEffect(() => {
    if (!open) return
    const onClick = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('mousedown', onClick)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onClick)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const handleSignOut = () => {
    setOpen(false)
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="user-menu-panel"
        aria-label="Account menu"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-[var(--app-r-pill)]',
          'border border-[var(--app-border)] bg-[var(--app-bg-3)]',
          'text-[13px] font-medium text-[var(--app-fg)]',
          'transition-colors [transition-duration:var(--app-dur-1)] hover:border-[var(--app-border-strong)]',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-accent)]'
        )}
      >
        {initial(email)}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            id="user-menu-panel"
            role="menu"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
            transition={{ duration: reduce ? 0 : 0.14, ease: [0.2, 0.7, 0.2, 1] }}
            className="absolute right-0 top-[calc(100%+6px)] w-[240px] overflow-hidden rounded-[var(--app-r-3)] border border-[var(--app-border-strong)] bg-[var(--app-bg-raised)]"
            style={{ boxShadow: 'var(--app-elev-pop)', zIndex: 'var(--app-z-tooltip)' }}
          >
            <div className="border-b border-[var(--app-border)] px-3 py-3">
              <p className="text-[11px] uppercase tracking-[var(--app-ls-eyebrow)] text-[var(--app-fg-dim)]">
                Signed in as
              </p>
              <p className="mt-0.5 truncate text-[13px] text-[var(--app-fg)]">
                {email ?? 'unknown'}
              </p>
            </div>
            <div className="py-1">
              <MenuItem
                icon={UserIcon}
                label="Profile"
                onClick={() => {
                  setOpen(false)
                  navigate('/settings#profile')
                }}
              />
              <MenuItem
                icon={SettingsIcon}
                label="Settings"
                onClick={() => {
                  setOpen(false)
                  navigate('/settings')
                }}
              />
            </div>
            <div className="border-t border-[var(--app-border)] py-1">
              <MenuItem icon={LogOut} label="Sign out" onClick={handleSignOut} danger />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function MenuItem({ icon: Icon, label, onClick, danger }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn(
        'flex h-9 w-full items-center gap-2.5 px-3 text-[13px]',
        'transition-colors [transition-duration:var(--app-dur-1)]',
        danger
          ? 'text-[var(--app-danger)] hover:bg-[var(--app-danger-tint)]'
          : 'text-[var(--app-fg)] hover:bg-[var(--app-bg-3)]'
      )}
    >
      <Icon className="h-4 w-4" strokeWidth={1.75} />
      <span>{label}</span>
    </button>
  )
}
