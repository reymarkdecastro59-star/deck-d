import { useState } from 'react'
import { Link } from 'react-router-dom'
import { SECTIONS } from '../tokens'
export default function TopNav({ activeSection = 0, onNavigate }) {
  const [open, setOpen] = useState(false)
  return (
    <nav className="deck-nav" aria-label="Main navigation">
      <a
        href="#home"
        className="deck-wordmark"
        onClick={(e) => {
          e.preventDefault()
          onNavigate(0)
          setOpen(false)
        }}
      >
        <i />
        DECK’D
      </a>
      <button
        type="button"
        className="deck-menu-toggle"
        aria-expanded={open}
        aria-controls="deck-nav-links"
        onClick={() => setOpen(!open)}
      >
        {open ? 'Close' : 'Menu'}
      </button>
      <ul id="deck-nav-links" className={open ? 'is-open' : ''}>
        {SECTIONS.map((s, i) => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              aria-current={activeSection === i ? 'location' : undefined}
              onClick={(e) => {
                e.preventDefault()
                onNavigate(i)
                setOpen(false)
              }}
            >
              {s.label}
            </a>
          </li>
        ))}
      </ul>
      <Link className="deck-login" to="/login">
        Log In
      </Link>
    </nav>
  )
}
