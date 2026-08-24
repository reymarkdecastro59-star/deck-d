import { motion, LayoutGroup } from 'motion/react'

const NAV_ITEMS = [
  { label: 'Home', index: 0 },
  { label: 'About', index: 1 },
  { label: 'Services', index: 2 },
]

export default function Navbar({ activeSection = 0, onNavigate }) {
  return (
    <nav
      className="nav-root fixed left-0 right-0 top-0 z-50 flex items-center justify-between"
      style={{ padding: '26px 68px' }}
    >
      {/* Logo */}
      <div className="flex items-center" style={{ gap: '13px' }}>
        <div
          style={{
            width: 35,
            height: 35,
            borderRadius: '50%',
            background: '#D9D9D9',
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '24px',
            fontWeight: 700,
            lineHeight: 1,
            color: '#fff',
          }}
        >
          DECK&apos;D
        </span>
      </div>

      {/* Center pill nav — LayoutGroup scopes the layoutId to this nav */}
      <LayoutGroup>
        <div
          className="flex"
          style={{
            gap: '6px',
            padding: '5px',
            borderRadius: '10px',
            background: 'rgba(5, 8, 28, 0.82)',
            border: '1px solid rgba(88, 125, 220, 0.42)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            boxShadow: '0 0 0 1px rgba(88,125,220,0.08)',
          }}
        >
          {NAV_ITEMS.map(({ label, index }) => {
            const isActive = index === activeSection
            return (
              <button
                key={label}
                onClick={() => onNavigate?.(index)}
                className="nav-pill-btn"
                style={{
                  position: 'relative',
                  width: '104px',
                  height: '29px',
                  borderRadius: '7px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '14px',
                  fontWeight: 500,
                  lineHeight: 1,
                  cursor: 'pointer',
                  border: '1px solid transparent',
                  background: 'transparent',
                  color: isActive ? '#fff' : '#9A9AB8',
                  transition: 'color 220ms ease',
                }}
              >
                {/* Sliding active pill — always mounted so Motion's FLIP
                    measurement is never disrupted by a mount/unmount cycle.
                    Visibility is controlled via opacity, not conditional render. */}
                <motion.span
                  layoutId="nav-pill"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '7px',
                    background: 'rgba(76,125,255,0.20)',
                    border: '1px solid rgba(76,125,255,0.38)',
                    opacity: isActive ? 1 : 0,
                    pointerEvents: 'none',
                  }}
                  transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
                />
                <span style={{ position: 'relative', zIndex: 1 }}>{label}</span>
              </button>
            )
          })}
        </div>
      </LayoutGroup>

      {/* Auth actions */}
      <div className="hidden md:flex" style={{ gap: '14px' }}>
        {[
          { label: 'Register', href: '/register' },
          { label: 'Log In', href: '/login' },
        ].map(({ label, href }) => (
          <a
            key={label}
            href={href}
            style={{
              width: '119px',
              height: '32px',
              borderRadius: '9px',
              background: 'rgba(5, 8, 28, 0.82)',
              border: '1px solid rgba(88, 125, 220, 0.42)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'Inter, sans-serif',
              fontSize: '14px',
              fontWeight: 500,
              lineHeight: 1,
              color: '#E5E5F2',
              textDecoration: 'none',
              transition: 'background 250ms ease, border-color 250ms ease',
            }}
          >
            {label}
          </a>
        ))}
      </div>
    </nav>
  )
}
