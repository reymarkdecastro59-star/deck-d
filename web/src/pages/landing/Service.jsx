import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import { Timer, Download, TrendingDown, Database, Layers, Sparkles } from 'lucide-react'
import bgFeatures from '@/assets/Bg_Features.png'

const FEATURES = [
  {
    key: 'auto',
    index: '01',
    icon: Timer,
    title: 'Auto Session Tracking',
    description:
      'Watches your process list every 10–30 seconds. The moment a game launches, the timer starts — and stops when you close it. Sessions under 60 seconds are filtered automatically.',
  },
  {
    key: 'steam',
    index: '02',
    icon: Download,
    title: 'Steam Library Import',
    description:
      "Connect your Steam profile once and DECK'D pulls your lifetime playtime history on day one. You get a full library from the start, not a blank slate.",
  },
  {
    key: 'decay',
    index: '03',
    icon: TrendingDown,
    title: 'Engagement Decay Charts',
    description:
      "See exactly when you started drifting from a game. Playtime trends, session history, and engagement charts show patterns you'd never notice scrolling through a library.",
  },
  {
    key: 'meta',
    index: '04',
    icon: Database,
    title: 'Game Metadata',
    description:
      'Every tracked game is enriched with genres, tags, and descriptions from RAWG — so your library is readable context, not just a list of process names.',
  },
  {
    key: 'cross',
    index: '05',
    icon: Layers,
    title: 'Cross-Launcher',
    description:
      "Steam, Epic, GOG, Battle.net, Ubisoft — if the game runs as a Win32 process, DECK'D logs it. No launcher API keys, no integrations, nothing to authorize.",
  },
  {
    key: 'reco',
    index: '06',
    icon: Sparkles,
    title: 'Smart Recommendations',
    description:
      "DECK'D learns which games you engage with and which you quietly abandon. It surfaces what to play next based on your actual patterns — not popularity charts.",
  },
]

function FeatureCard({ feature, reducedMotion }) {
  const ref = useRef(null)
  const IconComponent = feature.icon
  const restShadow = '0 0 0 1px rgba(88,125,220,0.08), 0 20px 48px rgba(0,0,0,0.62)'

  const handleMouseMove = (e) => {
    const card = ref.current
    if (!card) return
    const rect = card.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    card.style.setProperty('--mx', `${x}px`)
    card.style.setProperty('--my', `${y}px`)
    const cx = x / rect.width - 0.5
    const cy = y / rect.height - 0.5
    card.style.transform = `perspective(900px) rotateX(${cy * -16}deg) rotateY(${cx * 16}deg) translateZ(10px)`
    card.style.borderColor = 'rgba(88,125,220,0.65)'
    card.style.boxShadow =
      '0 0 0 1px rgba(88,125,220,0.20), 0 36px 72px rgba(0,0,0,0.85), 0 0 44px rgba(76,125,255,0.18)'
  }

  const handleMouseLeave = () => {
    const card = ref.current
    if (!card) return
    card.style.setProperty('--mx', '-9999px')
    card.style.setProperty('--my', '-9999px')
    card.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg) translateZ(0)'
    card.style.borderColor = 'rgba(88,125,220,0.32)'
    card.style.boxShadow = restShadow
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        '--mx': '-9999px',
        '--my': '-9999px',
        position: 'relative',
        overflow: 'hidden',
        height: '100%',
        borderRadius: '16px',
        background:
          'radial-gradient(circle at var(--mx) var(--my), rgba(88,125,220,0.14) 0%, transparent 52%), rgba(5,8,28,0.90)',
        border: '1px solid rgba(88,125,220,0.32)',
        boxShadow: restShadow,
        padding: '28px',
        transition: 'transform 0.10s ease-out, box-shadow 0.28s ease, border-color 0.28s ease',
        willChange: 'transform',
        cursor: 'default',
        boxSizing: 'border-box',
      }}
    >
      {/* Top highlight */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 0,
          left: '8%',
          right: '8%',
          height: '1px',
          background:
            'linear-gradient(to right, transparent, rgba(255,255,255,0.14) 30%, rgba(255,255,255,0.14) 70%, transparent)',
          pointerEvents: 'none',
        }}
      />

      {/* Watermark index */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          bottom: '-12px',
          right: '16px',
          fontFamily: "'Intel One Mono', monospace",
          fontSize: '120px',
          fontWeight: 700,
          lineHeight: 1,
          color: 'rgba(76,125,255,0.05)',
          userSelect: 'none',
          pointerEvents: 'none',
        }}
      >
        {feature.index}
      </div>

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            background: 'rgba(76,125,255,0.12)',
            border: '1px solid rgba(76,125,255,0.22)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '20px',
            flexShrink: 0,
          }}
        >
          <IconComponent size={18} color="#4C7DFF" strokeWidth={1.5} />
        </div>

        <div
          style={{
            fontFamily: "'Intel One Mono', monospace",
            fontSize: '11px',
            fontWeight: 600,
            letterSpacing: '2.4px',
            marginBottom: '10px',
            background: 'linear-gradient(135deg, #4C7DFF 0%, #7C3AED 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            display: 'inline-block',
          }}
        >
          {feature.index}
        </div>

        <h3
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '15px',
            fontWeight: 600,
            lineHeight: 1.25,
            color: '#FFFFFF',
            marginBottom: '10px',
          }}
        >
          {feature.title}
        </h3>

        <p
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '13px',
            fontWeight: 400,
            lineHeight: 1.72,
            color: '#8A8AA8',
          }}
        >
          {feature.description}
        </p>
      </div>
    </div>
  )
}

// Auto-advancing carousel for mobile — one card at a time, slow vertical slide
function MobileCarousel({ features, reducedMotion }) {
  const [active, setActive] = useState(0)
  const [dir, setDir] = useState(1)

  useEffect(() => {
    const t = setInterval(() => {
      setDir(1)
      setActive((i) => (i + 1) % features.length)
    }, 5000)
    return () => clearInterval(t)
  }, [features.length])

  const advance = (next) => {
    setDir(next > active ? 1 : -1)
    setActive(next)
  }

  const variants = reducedMotion
    ? {
        enter: { opacity: 0 },
        center: { opacity: 1, transition: { duration: 0.25 } },
        exit: { opacity: 0, transition: { duration: 0.25 } },
      }
    : {
        enter: (d) => ({ y: d > 0 ? '90%' : '-90%', opacity: 0 }),
        center: {
          y: 0,
          opacity: 1,
          transition: { duration: 1.1, ease: [0.25, 0.46, 0.45, 0.94] },
        },
        exit: (d) => ({
          y: d > 0 ? '-28%' : '28%',
          opacity: 0,
          transition: { duration: 0.6, ease: [0.4, 0, 1, 1] },
        }),
      }

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Card slot */}
      <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
        <AnimatePresence mode="sync" custom={dir} initial={false}>
          <motion.div
            key={active}
            custom={dir}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            style={{ position: 'absolute', inset: 0 }}
          >
            <FeatureCard feature={features[active]} reducedMotion={reducedMotion} />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Dot indicators — tap to jump */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '6px',
          flexShrink: 0,
          paddingBottom: '6px',
        }}
      >
        {features.map((_, i) => (
          <button
            key={i}
            onClick={() => advance(i)}
            aria-label={`Go to feature ${i + 1}`}
            style={{
              width: i === active ? 20 : 6,
              height: 6,
              borderRadius: 3,
              border: 'none',
              background: i === active ? '#4C7DFF' : 'rgba(255,255,255,0.18)',
              transition: 'all 0.4s ease',
              cursor: 'pointer',
              padding: 0,
              flexShrink: 0,
            }}
          />
        ))}
      </div>
    </div>
  )
}

export default function Service() {
  const shouldReduce = useReducedMotion()
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches
  )

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)')
    const handle = (e) => setIsMobile(e.matches)
    mq.addEventListener('change', handle)
    return () => mq.removeEventListener('change', handle)
  }, [])

  return (
    <section
      id="features"
      className="relative flex h-dvh flex-col overflow-hidden"
      style={{ background: '#05061a' }}
    >
      {/* 1. Texture */}
      <img
        src={bgFeatures}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover"
        style={{
          opacity: 0.18,
          animation: shouldReduce ? 'none' : 'bgBreathe 14s ease-in-out infinite',
          transformOrigin: 'center center',
        }}
      />

      {/* 2a. Orb — blue, top-left */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          width: '720px',
          height: '720px',
          top: '-120px',
          left: '-80px',
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(76,125,255,0.22) 0%, rgba(76,125,255,0.08) 45%, transparent 70%)',
          animation: shouldReduce ? 'none' : 'orb1 18s ease-in-out infinite',
          pointerEvents: 'none',
        }}
      />

      {/* 2b. Orb — purple, bottom-right */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          width: '820px',
          height: '820px',
          bottom: '-200px',
          right: '-120px',
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(124,58,237,0.18) 0%, rgba(124,58,237,0.06) 45%, transparent 70%)',
          animation: shouldReduce ? 'none' : 'orb2 24s ease-in-out infinite',
          pointerEvents: 'none',
        }}
      />

      {/* 2c. Orb — teal, center */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          width: '560px',
          height: '560px',
          top: '42%',
          left: '42%',
          transform: 'translate(-50%, -50%)',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(34,211,238,0.09) 0%, transparent 65%)',
          animation: shouldReduce ? 'none' : 'orb3 30s ease-in-out infinite',
          pointerEvents: 'none',
        }}
      />

      {/* 3. Radial dark overlay */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 70% at 50% 50%, rgba(5,6,26,0.82) 0%, rgba(5,6,26,0.35) 60%, rgba(5,6,26,0) 100%)',
        }}
      />

      {/* 4. Edge fades */}
      <div
        className="pointer-events-none absolute left-0 right-0 top-0"
        style={{ height: '140px', background: 'linear-gradient(to bottom, #0A0918, transparent)' }}
      />
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0"
        style={{ height: '48px', background: 'linear-gradient(to top, #0A0918, transparent)' }}
      />

      {/* Content — flex column filling the viewport */}
      <div
        className="service-content relative z-10 flex flex-col"
        style={{ flex: 1, minHeight: 0 }}
      >
        {/* Header */}
        <motion.div
          initial={shouldReduce ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          style={{ marginBottom: '28px', flexShrink: 0 }}
        >
          <p
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '3.4px',
              textTransform: 'uppercase',
              color: '#4C7DFF',
            }}
          >
            Services
          </p>
          <h2
            style={{
              fontFamily: "'Intel One Mono', ui-monospace, monospace",
              fontSize: 'clamp(28px, 3.2vw, 48px)',
              fontWeight: 500,
              lineHeight: 1.12,
              letterSpacing: '-1.2px',
              color: '#fff',
              marginTop: '14px',
            }}
          >
            Everything you need to
            <br />
            stay in the game.
          </h2>
        </motion.div>

        {/* Mobile: auto-carousel. Tablet+: grid */}
        {isMobile ? (
          <MobileCarousel features={FEATURES} reducedMotion={shouldReduce} />
        ) : (
          <div className="features-grid" style={{ flex: 1, minHeight: 0 }}>
            {FEATURES.map((feature, i) => (
              <motion.div
                key={feature.key}
                initial={shouldReduce ? false : { opacity: 0, y: 36, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.6, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                style={{ height: '100%' }}
              >
                <FeatureCard feature={feature} reducedMotion={shouldReduce} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
