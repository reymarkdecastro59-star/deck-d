const HEADLINE = 'NEW EXPERIENCE'

const headlineStyle = {
  fontFamily: "'Intel One Mono', ui-monospace, monospace",
  fontSize: 'clamp(42px, 5.83vw, 100px)',
  fontWeight: 500,
  lineHeight: 1,
  letterSpacing: '-2.4px',
  color: '#fff',
  whiteSpace: 'nowrap',
}

export default function Home() {
  return (
    <section id="home" className="relative h-dvh overflow-hidden">
      {/* Left-to-right gradient — blends bg image into solid bg; stays opaque past 48vw where the image starts */}
      <div
        className="pointer-events-none absolute left-0 top-0 h-full"
        style={{
          width: '72%',
          background:
            'linear-gradient(to right, #0A0918 0%, rgba(10,9,24,0.95) 62%, rgba(10,9,24,0.50) 78%, rgba(10,9,24,0) 100%)',
        }}
      />

      {/* Top vignette */}
      <div
        className="pointer-events-none absolute left-0 right-0 top-0"
        style={{
          height: '200px',
          background: 'linear-gradient(to bottom, rgba(10,9,24,0.6), transparent)',
        }}
      />

      {/* Bottom vignette */}
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0"
        style={{
          height: '180px',
          background: 'linear-gradient(to top, rgba(10,9,24,0.8), transparent)',
        }}
      />

      {/* Content layer */}
      <div className="home-content relative z-10 min-h-dvh" style={{ padding: '126px 84px 44px' }}>
        {/* Left — eyebrow · headline · reflection · body */}
        <div style={{ maxWidth: '900px' }}>
          <p
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '15px',
              fontWeight: 400,
              lineHeight: 1,
              color: '#5B7FE0',
            }}
          >
            Cross-launcher engagement tracker
          </p>

          {/* Headline */}
          <h1 className="select-none" style={{ ...headlineStyle, marginTop: '26px' }}>
            {HEADLINE}
          </h1>

          {/* Mirror reflection — scaleY(-1) translateY(-100%) technique */}
          <div
            style={{
              height: '88px',
              overflow: 'hidden',
              maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.62), transparent 78%)',
              WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.62), transparent 78%)',
            }}
          >
            <div
              style={{
                ...headlineStyle,
                color: 'rgba(255,255,255,0.55)',
                transform: 'scaleY(-1) translateY(-100%)',
                transformOrigin: 'top',
              }}
            >
              {HEADLINE}
            </div>
          </div>

          {/* Body copy */}
          <p
            style={{
              marginTop: '30px',
              fontFamily: 'Inter, sans-serif',
              fontSize: '18.5px',
              fontWeight: 400,
              lineHeight: 1.66,
              color: '#A6A6C2',
              maxWidth: '688px',
              textWrap: 'balance',
            }}
          >
            Every launcher on one timeline — see the games you&apos;re quietly drifting from, and
            what actually deserves your next session.
          </p>
        </div>

        {/* Glass card — bottom-right */}
        <div
          className="home-glass-card absolute"
          style={{
            right: '68px',
            bottom: '108px',
            width: '389px',
            height: '210px',
            borderRadius: '14px',
            background: 'rgba(5, 8, 28, 0.82)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            border: '1px solid rgba(88, 125, 220, 0.42)',
            boxShadow: '0 0 0 1px rgba(88,125,220,0.08), 0 24px 56px rgba(0,0,0,0.70)',
            boxSizing: 'border-box',
            padding: '22px 24px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              fontFamily: "'Intel One Mono', monospace",
              fontSize: '11px',
              fontWeight: 500,
              lineHeight: 1,
              letterSpacing: '2.6px',
              color: '#7A7A9E',
            }}
          >
            TAKE THE FIRST STEP
          </div>

          <div
            style={{
              marginTop: '14px',
              fontFamily: 'Inter, sans-serif',
              fontSize: '13.5px',
              fontWeight: 400,
              lineHeight: 1.6,
              color: '#9A9AB8',
            }}
          >
            Connect one launcher and DECK&apos;D starts logging sessions automatically - no manual
            library to maintain.
          </div>

          <div style={{ marginTop: 'auto', display: 'flex', gap: '14px' }}>
            <a
              href="/signup"
              className="home-cta-btn"
              style={{
                width: '154px',
                height: '38px',
                borderRadius: '9px',
                background: 'rgba(76,125,255,0.18)',
                border: '1px solid rgba(76,125,255,0.55)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: "'Intel One Mono', monospace",
                fontSize: '11.5px',
                fontWeight: 600,
                lineHeight: 1,
                letterSpacing: '1.2px',
                color: '#fff',
                textDecoration: 'none',
                flexShrink: 0,
                transition: 'background 250ms ease, border-color 250ms ease',
              }}
            >
              GET STARTED
            </a>
            <a
              href="#about"
              className="home-cta-btn"
              style={{
                width: '154px',
                height: '38px',
                borderRadius: '9px',
                background: 'rgba(5,8,28,0.70)',
                border: '1px solid rgba(88,125,220,0.38)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: "'Intel One Mono', monospace",
                fontSize: '11.5px',
                fontWeight: 600,
                lineHeight: 1,
                letterSpacing: '1.2px',
                color: '#C8C8E0',
                textDecoration: 'none',
                flexShrink: 0,
                transition: 'background 250ms ease, border-color 250ms ease',
              }}
            >
              CONTACT US
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
