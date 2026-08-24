const STATS = [
  { value: 'Open', label: 'Source' },
  { value: 'Zero', label: 'Manual Logging' },
  { value: 'Live', label: 'Session Sync' },
]

const DECAY_COLOR = {
  active: '#22d3ee',
  drifting: '#f59e0b',
  abandoned: '#6b7280',
}

const LIBRARY = [
  {
    name: 'Cyberpunk 2077',
    launcher: 'Steam',
    hours: '120h',
    lastPlayed: '3d ago',
    decay: 'active',
    color: '#0e1f3d',
  },
  {
    name: 'Elden Ring',
    launcher: 'Steam',
    hours: '58h',
    lastPlayed: '2w ago',
    decay: 'drifting',
    color: '#2a1410',
  },
  {
    name: 'Fortnite',
    launcher: 'Epic Games',
    hours: '43h',
    lastPlayed: '1mo ago',
    decay: 'drifting',
    color: '#0d2e1a',
  },
  {
    name: 'Hades II',
    launcher: 'Steam',
    hours: '31h',
    lastPlayed: '3mo ago',
    decay: 'abandoned',
    color: '#1e0f2e',
  },
  {
    name: 'Starfield',
    launcher: 'Xbox / PC',
    hours: '22h',
    lastPlayed: '8mo ago',
    decay: 'abandoned',
    color: '#101820',
  },
]

export default function About() {
  return (
    <section id="about" className="relative flex h-dvh items-center overflow-hidden">
      {/* Gradient — blends left edge of bg image into background, fades right into content area */}
      <div
        className="pointer-events-none absolute left-0 top-0 h-full w-full"
        style={{
          background:
            'linear-gradient(to right, #0A0918 0%, rgba(10,9,24,0.08) 12%, rgba(10,9,24,0.85) 27%, #0A0918 35%)',
        }}
      />

      {/* Static centre glow — fills the empty middle band between image and content */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute"
        style={{
          width: '520px',
          height: '520px',
          borderRadius: '50%',
          top: '50%',
          left: '38%',
          transform: 'translate(-50%, -50%)',
          background:
            'radial-gradient(circle, rgba(76,125,255,0.13) 0%, rgba(76,125,255,0.05) 45%, transparent 70%)',
        }}
      />

      <div className="about-content relative z-10 w-full" style={{ padding: '100px 84px' }}>
        <div className="about-grid">
          {/* Left — text */}
          <div>
            <p
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '12px',
                fontWeight: 600,
                letterSpacing: '2.4px',
                textTransform: 'uppercase',
                color: '#4C7DFF',
              }}
            >
              About DECK&apos;D
            </p>

            <h2
              style={{
                fontFamily: "'Intel One Mono', ui-monospace, monospace",
                fontSize: 'clamp(36px, 4.2vw, 66px)',
                fontWeight: 500,
                lineHeight: 1.05,
                letterSpacing: '-1.6px',
                color: '#fff',
                marginTop: '20px',
              }}
            >
              Your Gaming
              <br />
              Universe,
              <br />
              Unified.
            </h2>

            <p
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '15.5px',
                fontWeight: 400,
                lineHeight: 1.72,
                color: '#9A9AB8',
                maxWidth: '460px',
                marginTop: '24px',
              }}
            >
              All your launchers, one timeline. DECK&apos;D logs every session automatically so you
              can see what you&apos;re actually playing, what you&apos;ve quietly quit, and
              what&apos;s worth coming back to.
            </p>

            <div className="about-stats" style={{ display: 'flex', marginTop: '48px' }}>
              {STATS.map((stat, i) => (
                <div
                  key={stat.value}
                  style={{
                    paddingRight: '32px',
                    paddingLeft: i === 0 ? '0' : '32px',
                    borderLeft: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.10)',
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'Intel One Mono', monospace",
                      fontSize: 'clamp(28px, 2.8vw, 40px)',
                      fontWeight: 500,
                      lineHeight: 1,
                      color: '#fff',
                    }}
                  >
                    {stat.value}
                  </div>
                  <div
                    style={{
                      fontFamily: 'Inter, sans-serif',
                      fontSize: '12px',
                      fontWeight: 400,
                      color: '#7A7A9E',
                      marginTop: '7px',
                    }}
                  >
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — Library card */}
          <div
            className="about-library-card"
            style={{
              borderRadius: '14px',
              background: 'rgba(5, 8, 28, 0.82)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
              border: '1px solid rgba(88, 125, 220, 0.42)',
              boxShadow: '0 0 0 1px rgba(88,125,220,0.08), 0 24px 56px rgba(0,0,0,0.70)',
              padding: '22px',
              overflow: 'hidden',
            }}
          >
            <p
              style={{
                fontFamily: "'Intel One Mono', monospace",
                fontSize: '11px',
                fontWeight: 500,
                letterSpacing: '2px',
                textTransform: 'uppercase',
                color: '#7A7A9E',
                marginBottom: '20px',
              }}
            >
              My Library
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {LIBRARY.map((game) => (
                <div
                  key={game.name}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '12px 14px',
                    borderRadius: '9px',
                    background: 'rgba(255,255,255,0.05)',
                  }}
                >
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '7px',
                      background: game.color,
                      border: '1px solid rgba(255,255,255,0.10)',
                      flexShrink: 0,
                    }}
                  />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'baseline',
                        gap: '8px',
                      }}
                    >
                      <div
                        style={{
                          fontFamily: 'Inter, sans-serif',
                          fontSize: '13px',
                          fontWeight: 600,
                          color: '#FFFFFF',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {game.name}
                      </div>
                      <div
                        style={{
                          fontFamily: "'Intel One Mono', monospace",
                          fontSize: '10.5px',
                          fontWeight: 500,
                          color: '#5B7FE0',
                          flexShrink: 0,
                        }}
                      >
                        {game.hours}
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: '5px',
                      }}
                    >
                      <div
                        style={{
                          fontFamily: 'Inter, sans-serif',
                          fontSize: '11px',
                          fontWeight: 400,
                          color: '#4C7DFF',
                        }}
                      >
                        {game.launcher}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <div
                          style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: DECAY_COLOR[game.decay],
                            flexShrink: 0,
                          }}
                        />
                        <div
                          style={{
                            fontFamily: "'Intel One Mono', monospace",
                            fontSize: '10.5px',
                            fontWeight: 400,
                            color: DECAY_COLOR[game.decay],
                          }}
                        >
                          {game.lastPlayed}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
