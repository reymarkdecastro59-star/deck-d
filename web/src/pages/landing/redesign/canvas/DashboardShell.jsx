import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { useReducedMotion } from 'motion/react'
import { useMasterTimeline } from '../hooks/useMasterTimeline'
import { smoothstep, transitionProgress } from '../hooks/timelinePhases'
import { COLORS, TYPE } from '../tokens'
import manifest from '../../../../assets/landing/covers/covers.json'
import { buildDashboardRows, formatHours } from './dashboardData'
import './DashboardShell.css'

const textureModules = import.meta.glob('../../../../assets/landing/covers/*.webp', {
  eager: true,
  as: 'url',
})

const BASE_POSITIONS = {
  chrome: [0, 2.2, 1.2],
  main: [0, 0.05, 0.4],
  library: [0, -2.35, -0.4],
}

function coverUrls() {
  return Object.fromEntries(
    manifest.covers.map((cover) => {
      const path = `../../../../assets/landing/covers/${cover.file}`
      const url = textureModules[path]
      if (!url) throw new Error(`Missing dashboard cover: ${cover.file}`)
      return [cover.slug, url]
    })
  )
}

function SessionRow({ row, coverUrl }) {
  return (
    <article className={`dashboard-shell__session dashboard-shell__session--${row.tier}`}>
      <img src={coverUrl} alt={`${row.title} cover`} />
      <div className="dashboard-shell__session-copy">
        <div className="dashboard-shell__session-heading">
          <strong>{row.title}</strong>
          {row.tier === 'drifting' && <span aria-label="Engagement drifting">⚠</span>}
        </div>
        <p>
          {formatHours(row.hoursThisWeek)} this week · Last played {row.lastPlayed}
        </p>
        <div className="dashboard-shell__meter" aria-hidden="true">
          <i style={{ width: `${Math.min(row.hoursThisWeek / 10, 1) * 100}%` }} />
        </div>
      </div>
    </article>
  )
}

function RecommendationCard({ row, coverUrl }) {
  return (
    <article className="dashboard-shell__recommendation">
      <img src={coverUrl} alt={`${row.title} cover`} />
      <div className="dashboard-shell__recommendation-copy">
        <strong>{row.title}</strong>
        <em>{row.recommendationReason}</em>
        <span>PLAY →</span>
      </div>
    </article>
  )
}

function PanelPlane({ size, materialRef }) {
  return (
    <mesh renderOrder={3}>
      <planeGeometry args={size} />
      <meshBasicMaterial
        ref={materialRef}
        color={COLORS.bg}
        transparent
        opacity={0}
        depthWrite={false}
      />
    </mesh>
  )
}

export default function DashboardShell() {
  const { scrollProgress, transition } = useMasterTimeline()
  const reducedMotion = useReducedMotion()
  const groupRef = useRef()
  const chromeRef = useRef()
  const mainRef = useRef()
  const libraryRef = useRef()
  const htmlRef = useRef()
  const materialRefs = useRef([])
  const rows = useMemo(() => buildDashboardRows(manifest.covers), [])
  const urls = useMemo(() => coverUrls(), [])
  const activeRows = rows.filter((row) => row.tier === 'active')
  const driftingRows = rows.filter((row) => row.tier === 'drifting')
  const recommendations = rows.filter((row) => row.tier === 'abandoned')

  useFrame(() => {
    const p = scrollProgress?.get?.() ?? 0
    const recomposition =
      transition.recomposition?.get?.() ?? transitionProgress(p, 'RECOMPOSITION')
    const resolve = transition.resolve?.get?.() ?? transitionProgress(p, 'RESOLVE')
    const opacity = reducedMotion
      ? smoothstep((p - 0.55) / 0.05) * (1 - smoothstep((p - 0.76) / 0.04))
      : smoothstep(recomposition) * (1 - smoothstep(resolve))
    const group = groupRef.current

    if (!group) return
    group.visible = opacity > 0.01
    if (!group.visible) return

    const foldT = reducedMotion ? 1 : smoothstep(recomposition)
    const exitT = reducedMotion ? 0 : smoothstep(resolve)
    chromeRef.current?.position.set(
      0,
      BASE_POSITIONS.chrome[1] + (1 - foldT) * 2.5,
      BASE_POSITIONS.chrome[2] + (1 - foldT) * 4
    )
    mainRef.current?.position.set(
      0,
      BASE_POSITIONS.main[1],
      BASE_POSITIONS.main[2] + (1 - foldT) * 4
    )
    libraryRef.current?.position.set(
      0,
      BASE_POSITIONS.library[1] - (1 - foldT) * 2.5,
      BASE_POSITIONS.library[2] + (1 - foldT) * 4
    )
    group.position.y = exitT * 2

    materialRefs.current.forEach((material) => {
      if (material) material.opacity = opacity * 0.92
    })
    if (htmlRef.current) htmlRef.current.style.opacity = opacity
  })

  const shellStyle = {
    '--dash-bg': COLORS.bgDeep,
    '--dash-panel': COLORS.panelBg,
    '--dash-border': COLORS.panelBorder,
    '--dash-fg': COLORS.fg,
    '--dash-muted': COLORS.muted,
    '--dash-accent': COLORS.accent,
    '--dash-active': COLORS.active,
    '--dash-drifting': COLORS.drifting,
    '--dash-abandoned': COLORS.abandoned,
    '--dash-display': TYPE.display,
    '--dash-body': TYPE.body,
  }

  return (
    <group ref={groupRef} visible={false}>
      <group ref={chromeRef} name="chrome" position={BASE_POSITIONS.chrome}>
        <PanelPlane
          size={[7.5, 0.62]}
          materialRef={(node) => {
            materialRefs.current[0] = node
          }}
        />
      </group>
      <group ref={mainRef} name="main" position={BASE_POSITIONS.main}>
        <PanelPlane
          size={[7.5, 3.55]}
          materialRef={(node) => {
            materialRefs.current[1] = node
          }}
        />
      </group>
      <group ref={libraryRef} name="library" position={BASE_POSITIONS.library}>
        <PanelPlane
          size={[7.5, 1.02]}
          materialRef={(node) => {
            materialRefs.current[2] = node
          }}
        />
      </group>

      <Html
        transform
        center
        position={[0, 0, 0]}
        distanceFactor={4}
        occlude={false}
        style={{ pointerEvents: 'none' }}
      >
        <div ref={htmlRef} className="dashboard-shell" style={shellStyle}>
          <header className="dashboard-shell__header">
            <b>DECK'D</b>
            <span>WEEK 37 · 2026-09-11</span>
            <div className="dashboard-shell__user">
              <i />
              MJ
            </div>
          </header>

          <main className="dashboard-shell__main">
            <section className="dashboard-shell__sessions">
              <h2>ACTIVE SESSIONS</h2>
              {activeRows.map((row) => (
                <SessionRow key={row.slug} row={row} coverUrl={urls[row.slug]} />
              ))}
              <div className="dashboard-shell__divider" />
              {driftingRows.map((row) => (
                <SessionRow key={row.slug} row={row} coverUrl={urls[row.slug]} />
              ))}
            </section>
            <aside className="dashboard-shell__recommended">
              <h2>RECOMMENDED NEXT</h2>
              {recommendations.map((row) => (
                <RecommendationCard key={row.slug} row={row} coverUrl={urls[row.slug]} />
              ))}
            </aside>
          </main>

          <footer className="dashboard-shell__library">
            <h2>GAME LIBRARY ({rows.length})</h2>
            <div className="dashboard-shell__covers">
              {rows.map((row) => (
                <img
                  key={row.slug}
                  className={`dashboard-shell__cover dashboard-shell__cover--${row.tier}`}
                  src={urls[row.slug]}
                  alt={`${row.title} cover`}
                />
              ))}
            </div>
          </footer>
        </div>
      </Html>
    </group>
  )
}
