import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { SECTIONS, COLORS, TYPE } from '../tokens'

// LEFT RAIL — crosshair mark + rolling atmospheric text.
// Mimics kprverse's persistent console-log character.
// Text lines cycle every 4s to give ambient life without demanding attention.

const AMBIENT_LINES = [
  '// INITIALIZING SESSION #4821',
  '// SYNCING · STEAM · EPIC · GOG',
  '// CYBERPUNK 2077 · 02:14:36 · ACTIVE',
  '// ELDEN RING · 14d idle · DRIFTING',
  '// RESOLVING RAWG · 12 games',
  '// DECAY WEIGHTS UPDATED · 14D',
]

export function LeftRail() {
  const [idx, setIdx] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % AMBIENT_LINES.length), 4000)
    return () => clearInterval(t)
  }, [])

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed z-40 hidden md:flex"
      style={{
        top: 0,
        bottom: 0,
        left: 0,
        width: '44px',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '110px 0 44px',
      }}
    >
      {/* Crosshair mark */}
      <div style={{ width: 22, height: 22, position: 'relative', opacity: 0.55 }}>
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: 0,
            right: 0,
            height: 1,
            background: COLORS.fg,
            transform: 'translateY(-50%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: 0,
            bottom: 0,
            width: 1,
            background: COLORS.fg,
            transform: 'translateX(-50%)',
          }}
        />
      </div>

      {/* Rolling atmospheric text — vertical writing mode */}
      <div
        style={{
          writingMode: 'vertical-rl',
          transform: 'rotate(180deg)',
          fontFamily: TYPE.mono,
          fontSize: '10px',
          fontWeight: 500,
          letterSpacing: '2.4px',
          color: COLORS.muted,
          height: '340px',
          display: 'flex',
          alignItems: 'flex-end',
          overflow: 'hidden',
        }}
      >
        <AnimatePresence mode="wait">
          <motion.span
            key={idx}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
          >
            {AMBIENT_LINES[idx]}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  )
}

// RIGHT RAIL — section counter + scroll progress bar.
// Counter matches "01 / 05" pattern from the existing landing.
// Progress bar is a tall thin line that fills as scroll advances.

export function RightRail({ activeSection = 0, scrollProgress }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed z-40 hidden md:flex"
      style={{
        top: 0,
        bottom: 0,
        right: 0,
        width: '44px',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '110px 0 44px',
      }}
    >
      {/* Section counter */}
      <div
        style={{
          fontFamily: TYPE.mono,
          fontSize: '11px',
          fontWeight: 500,
          letterSpacing: '2px',
          color: COLORS.muted,
          textAlign: 'center',
          lineHeight: 1.4,
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
            style={{ color: COLORS.fg }}
          >
            {String(activeSection + 1).padStart(2, '0')}
          </motion.div>
        </AnimatePresence>
        <div style={{ color: 'rgba(255,255,255,0.15)', margin: '2px 0' }}>/</div>
        <div>{String(SECTIONS.length).padStart(2, '0')}</div>
      </div>

      {/* Vertical progress bar */}
      <div
        style={{
          position: 'relative',
          width: '1px',
          height: '260px',
          background: 'rgba(255,255,255,0.10)',
        }}
      >
        <motion.div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            background: COLORS.accent,
            scaleY: scrollProgress ?? 0,
            transformOrigin: 'top',
            height: '100%',
          }}
        />
      </div>
    </div>
  )
}
