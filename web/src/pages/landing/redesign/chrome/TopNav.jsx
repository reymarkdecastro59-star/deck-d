import { motion, LayoutGroup } from 'motion/react'
import { Link } from 'react-router-dom'
import { SECTIONS, COLORS, TYPE } from '../tokens'

// Fixed top nav — persists across every section.
// Active tab gets a small square bullet + Motion layoutId slider,
// matching the kprverse "■ PROJECT" pattern.

export default function TopNav({ activeSection = 0, onNavigate }) {
  return (
    <nav
      className="fixed left-0 right-0 top-0 z-50 flex items-center justify-between"
      style={{
        padding: '22px 44px',
        background:
          'linear-gradient(to bottom, rgba(5,6,26,0.72), rgba(5,6,26,0.28) 60%, transparent)',
      }}
    >
      {/* Logo */}
      <Link to="/" className="flex items-center" style={{ gap: '11px', textDecoration: 'none' }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: '#d9d9d9',
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontFamily: TYPE.body,
            fontSize: '20px',
            fontWeight: 700,
            lineHeight: 1,
            color: COLORS.fg,
            letterSpacing: '0.5px',
          }}
        >
          DECK&apos;D
        </span>
      </Link>

      {/* Center rail */}
      <LayoutGroup>
        <ul
          className="hidden md:flex"
          style={{
            gap: '2px',
            listStyle: 'none',
            padding: 0,
            margin: 0,
          }}
        >
          {SECTIONS.map((section, i) => {
            const isActive = i === activeSection
            return (
              <li key={section.id}>
                <button
                  type="button"
                  onClick={() => onNavigate?.(i)}
                  className="topnav-tab"
                  style={{
                    position: 'relative',
                    padding: '10px 16px',
                    background: 'transparent',
                    border: 'none',
                    fontFamily: TYPE.mono,
                    fontSize: '11px',
                    fontWeight: 500,
                    letterSpacing: '2px',
                    textTransform: 'uppercase',
                    color: isActive ? COLORS.fg : COLORS.muted,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'color 220ms ease',
                  }}
                >
                  <span
                    style={{
                      position: 'relative',
                      width: '6px',
                      height: '6px',
                      display: 'inline-block',
                    }}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="topnav-bullet"
                        style={{
                          position: 'absolute',
                          inset: 0,
                          background: COLORS.fg,
                        }}
                        transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
                      />
                    )}
                  </span>
                  {section.label}
                </button>
              </li>
            )
          })}
        </ul>
      </LayoutGroup>

      {/* Auth pills */}
      <div className="hidden items-center md:flex" style={{ gap: '10px' }}>
        <Link to="/login" className="topnav-auth" style={authGhost}>
          Log In
        </Link>
        <Link to="/signup" className="topnav-auth" style={authPrimary}>
          Register
        </Link>
      </div>
    </nav>
  )
}

const authBase = {
  padding: '8px 18px',
  borderRadius: '9px',
  fontFamily: TYPE.body,
  fontSize: '13px',
  fontWeight: 500,
  lineHeight: 1,
  textDecoration: 'none',
  cursor: 'pointer',
  transition: 'background 220ms ease, border-color 220ms ease, color 220ms ease',
  border: '1px solid',
  backdropFilter: 'blur(4px)',
  WebkitBackdropFilter: 'blur(4px)',
}

const authGhost = {
  ...authBase,
  background: 'rgba(5, 8, 28, 0.6)',
  borderColor: COLORS.panelBorder,
  color: '#e5e5f2',
}

const authPrimary = {
  ...authBase,
  background: COLORS.accentSoft,
  borderColor: COLORS.accentBorder,
  color: COLORS.fg,
}
