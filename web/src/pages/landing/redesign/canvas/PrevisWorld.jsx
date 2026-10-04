import { createContext, useContext, useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox, useTexture } from '@react-three/drei'
import { CanvasTexture, SRGBColorSpace } from 'three'
import { useMasterTimeline } from '../hooks/useMasterTimeline'
import { interval, lerp, sample } from '../hooks/timelinePhases'
import { panelTexture } from './directedMaterials'
import brandUrl from '../../../../assets/landing/deckd-wordmark.svg'
import hadesUrl from '../../../../assets/landing/covers/hades-keyart.jpg'
const ArtContext = createContext(null)
const coverFiles = import.meta.glob('../../../../assets/landing/covers/*.webp', {
  eager: true,
  query: '?url',
  import: 'default',
})
const slugs = [
  'elden-ring',
  'cyberpunk-2077',
  'stardew-valley',
  'hades',
  'hollow-knight',
  'portal-2',
  'baldurs-gate-3',
  'celeste',
]
function Surface({ texture, width, height, position = [0, 0, 0.1], materialRef }) {
  return (
    <mesh position={position} receiveShadow>
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial
        ref={materialRef}
        map={texture}
        emissiveMap={texture}
        emissive="#fff"
        emissiveIntensity={0.25}
        transparent
        roughness={0.8}
      />
    </mesh>
  )
}

// Labels are drafting annotations only. No artwork, generated imagery or material effects.
function Label({ text, width = 1.5, height = 0.35, position = [0, 0, 0.09] }) {
  const art = useContext(ArtContext)
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 768
    canvas.height = 160
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = art ? '#18232e' : '#d8d8d8'
    ctx.fillRect(0, 0, 768, 160)
    ctx.fillStyle = art ? '#e4e9ee' : '#202020'
    ctx.font = '500 48px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, 384, 80, 740)
    const map = new CanvasTexture(canvas)
    map.colorSpace = SRGBColorSpace
    return map
  }, [text, art])
  useEffect(() => () => texture.dispose(), [texture])
  return (
    <mesh position={position}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial map={texture} />
    </mesh>
  )
}
function Body({ size, color = '#606060', children }) {
  const art = useContext(ArtContext)
  return (
    <group>
      <RoundedBox args={size} radius={0.025} smoothness={2} castShadow receiveShadow>
        <meshStandardMaterial
          color={art ? '#26313a' : color}
          roughness={0.84}
          metalness={art ? 0.12 : 0}
        />
      </RoundedBox>
      {children}
    </group>
  )
}
export function GameCard({ name }) {
  const art = useContext(ArtContext)
  const texture = art?.covers[names.indexOf(name)]
  return (
    <Body size={[1.5, 2.15, 0.13]} color="#777777">
      <mesh position={[0, 0, 0.071]} receiveShadow>
        <planeGeometry args={[1.39, 2.04]} />
        <meshStandardMaterial
          color={texture ? '#ffffff' : '#b2b2b2'}
          map={texture}
          emissiveMap={texture}
          emissive={texture ? '#ffffff' : '#000000'}
          emissiveIntensity={0.2}
          roughness={0.78}
        />
      </mesh>
      <mesh position={[0, 0, -0.071]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[1.39, 2.04]} />
        <meshStandardMaterial color="#292929" />
      </mesh>
      {!art && <Label text={name} width={1.27} position={[0, -0.62, 0.078]} />}
    </Body>
  )
}
const names = [
  'ELDEN RING',
  'CYBERPUNK',
  'STARDEW',
  'HADES',
  'HOLLOW KNIGHT',
  'PORTAL 2',
  'BALDUR’S GATE',
  'CELESTE',
]
const scattered = [
  [2.5, 0.3, 1.1],
  [4.8, 1.5, -2.1],
  [1.4, 2, -3.8],
  [4.6, -0.8, 0.5],
  [2.1, -1.1, -1.5],
  [5.8, 0.1, -4.6],
  [0.5, -0.8, -3.2],
  [4.0, 2.8, -5.2],
]
function setPose(r, v) {
  r.position.set(...v.slice(0, 3))
  r.rotation.set(...v.slice(3, 6))
  r.scale.setScalar(v[6] ?? 1)
}
function Cards() {
  const refs = useRef([])
  const { sceneProgress } = useMasterTimeline()
  useFrame(() => {
    const p = sceneProgress.get()
    refs.current.forEach((r, i) => {
      const home = [2.65 + i * 0.095, -0.2 + i * 0.048, -i * 0.19, 0.12, -0.32, -0.03, 1]
      const spread = [
        ...scattered[i],
        0.08,
        ((i % 3) - 1) * 0.18,
        i % 2 ? 0.07 : -0.06,
        i === 0 ? 1 : 0.71,
      ]
      const gathered = [
        2.65 + i * 0.11,
        -0.15 + i * 0.07,
        -i * 0.27,
        0.09,
        -0.25,
        0,
        i === 0 ? 0.9 : 0.7,
      ]
      const parked = [
        4.7 + (i % 3) * 0.28,
        -0.7 + (i % 2) * 0.15,
        -4.8 - i * 0.25,
        0.08,
        -0.25,
        0,
        0.5,
      ]
      const final = [2.7 + i * 0.08, -0.15 + i * 0.045, -i * 0.17, 0.19, -0.38, -0.035, 0.85]
      let v = sample(p, [
        [0, ...home],
        [0.1, ...home],
        [0.16, ...spread],
        [0.27, ...spread],
        [0.33, ...gathered],
        [0.4, ...parked],
        [0.57, ...parked],
        [0.63, 1.7 + (i % 2) * 0.66, 0.6 - Math.floor(i / 2) * 0.53, 0.25, 0.025, -0.1, 0, 0.22],
        [0.88, 1.7 + (i % 2) * 0.66, 0.6 - Math.floor(i / 2) * 0.53, 0.25, 0.025, -0.1, 0, 0.22],
        [0.94, ...final],
        [1, ...final],
      ])
      if (i === 0 && p >= 0.33 && p < 0.48)
        v = sample(p, [
          [0.33, ...gathered],
          [0.36, 1.5, 0.1, 1, 0.08, -0.2, 0, 0.64],
          [0.4, 1.5, 0.1, 1, 0.08, -0.2, 0, 0.64],
          [0.46, ...parked],
        ])
      if ([2, 3, 4].includes(i) && p >= 0.46 && p < 0.88) {
        const n = { 2: 0, 4: 1, 3: 2 }[i]
        const candidate = [
          1.4 + n * 1.42,
          -0.68 + 0.15 * n,
          0.6 - n * 0.5,
          0.08,
          -0.22 + n * 0.13,
          0.03 * (n - 1),
          0.62,
        ]
        const dock =
          i === 3
            ? [4.35, -0.63, 0.55, 0.025, -0.1, 0, 0.4]
            : [1.7 + (i % 2) * 0.66, 0.6 - Math.floor(i / 2) * 0.53, 0.25, 0.025, -0.1, 0, 0.22]
        v = sample(p, [
          [0.46, ...parked],
          [0.5, ...candidate],
          [0.535, ...candidate],
          [0.57, ...(i === 3 ? [3.8, -0.2, 1.25, 0.04, -0.1, 0, 0.76] : parked)],
          [0.63, ...dock],
          [0.88, ...dock],
        ])
      }
      if (p >= 0.88) {
        const dock =
          i === 3
            ? [4.35, -0.63, 0.55, 0.025, -0.1, 0, 0.4]
            : [1.7 + (i % 2) * 0.66, 0.6 - Math.floor(i / 2) * 0.53, 0.25, 0.025, -0.1, 0, 0.22]
        v = sample(p, [
          [0.88, ...dock],
          [0.94, ...final],
          [1, ...final],
        ])
      }
      setPose(r, v)
    })
  })
  return names.map((name, i) => (
    <group
      name={name}
      key={name}
      ref={(r) => {
        refs.current[i] = r
      }}
    >
      <GameCard name={name} />
    </group>
  ))
}
function Bars({ kind }) {
  return [0, 1, 2, 3, 4, 5].map((i) => (
    <mesh
      key={i}
      position={[-0.83 + i * 0.32, -0.38 + [0.15, 0.25, 0.18, 0.42, 0.32, 0.55][i] / 2, 0.09]}
    >
      <boxGeometry args={[0.2, [0.15, 0.25, 0.18, 0.42, 0.32, 0.55][i], 0.035]} />
      <meshStandardMaterial color={kind === 1 ? '#b8b8b8' : '#939393'} />
    </mesh>
  ))
}
function Rig() {
  const art = useContext(ArtContext)
  const refs = useRef([]),
    root = useRef(),
    recommendationMaterial = useRef()
  const { sceneProgress } = useMasterTimeline()
  useFrame(() => {
    const p = sceneProgress.get()
    if (art && recommendationMaterial.current) {
      const texture = art.panels[p >= 0.54 ? 'selected' : 'recommend']
      recommendationMaterial.current.map = texture
      recommendationMaterial.current.emissiveMap = texture
    }
    // The rig rises from behind the same shelf and retracts into the dashboard body.
    root.current.position.y = lerp(-5, 0, interval(p, 0.32, 0.36)) - 5 * interval(p, 0.57, 0.63)
    refs.current.forEach((r, i) => {
      const enter = interval(p, [0.33, 0.4, 0.48][i], [0.355, 0.43, 0.505][i])
      const leave = interval(p, [0.4, 0.48, 0.57][i], [0.43, 0.505, 0.615][i])
      r.position.set(3.05 + i * 0.35, 1.3 - i * 1.42, -2.9 + (enter - leave) * 3.05)
    })
  })
  return (
    <group ref={root}>
      <group position={[3.45, -0.1, -3.05]}>
        <Body size={[0.075, 4.9, 0.11]} color="#484848" />
      </group>
      {['TRACK · SESSION 02:14', 'UNDERSTAND · RPG 72%', 'RECOMMEND · YOUR NEXT GAME'].map(
        (name, i) => (
          <group
            key={name}
            ref={(r) => {
              refs.current[i] = r
            }}
            rotation={[0.025, -0.12, 0]}
          >
            <Body size={[2.9, 1.3, 0.19]} color="#454545">
              <mesh position={[0, 0, 0.099]}>
                <planeGeometry args={[2.74, 1.14]} />
                <meshStandardMaterial color="#757575" />
              </mesh>
              {art ? (
                <Surface
                  materialRef={i === 2 ? recommendationMaterial : undefined}
                  texture={art.panels[['track', 'understand', 'recommend'][i]]}
                  width={2.74}
                  height={1.14}
                  position={[0, 0, 0.105]}
                />
              ) : (
                <>
                  <Label text={name} width={2.5} height={0.25} position={[0, 0.35, 0.105]} />
                  {i < 2 ? (
                    <Bars kind={i} />
                  ) : (
                    <Label
                      text="3 CANDIDATES · 1 NEXT GAME"
                      width={2.2}
                      height={0.23}
                      position={[0, -0.2, 0.106]}
                    />
                  )}
                </>
              )}
            </Body>
          </group>
        )
      )}
    </group>
  )
}
function Product() {
  const art = useContext(ArtContext)
  const root = useRef(),
    panels = useRef([]),
    frame = useRef(),
    brand = useRef()
  const { sceneProgress } = useMasterTimeline()
  useFrame(() => {
    const p = sceneProgress.get(),
      enter = interval(p, 0.57, 0.63),
      close = interval(p, 0.88, 0.94)
    root.current.position.set(3.25, lerp(-5, 0, enter), -0.12)
    root.current.rotation.set(lerp(0.025, 0.19, close), lerp(-0.1, -0.38, close), -0.035 * close)
    frame.current.scale.set(lerp(1, 0.25, close), lerp(1, 0.54, close), 1)
    frame.current.position.set(-0.55 * close, -0.15 * close, 0.34 * close)
    brand.current.scale.setScalar(interval(p, 0.91, 0.94))
    brand.current.position.set(-0.55 * close, -0.15 * close, 0.44 * close)
    panels.current.forEach((r, i) => {
      const base = [
        [-1.13, 0.15, 0.13],
        [1.05, 0.68, 0.15],
        [1.05, -0.78, 0.17],
      ][i]
      const insight = interval(p, 0.68, 0.7) * (1 - interval(p, 0.73, 0.75))
      const recommend = interval(p, 0.73, 0.75) * (1 - interval(p, 0.78, 0.8))
      const custom = interval(p, 0.83, 0.85)
      r.position.set(
        lerp(base[0] + (i === 0 ? 0.14 * custom : 0), -0.55 + i * 0.075, close),
        lerp(base[1], -0.15 + i * 0.05, close),
        base[2] +
          (i === 1 ? insight * 0.35 : i === 2 ? recommend * 0.25 : 0) -
          close * (0.4 + i * 0.15)
      )
      r.scale.set(lerp(1 + (i === 1 ? insight * 0.2 : 0), 0.45, close), lerp(1, 0.65, close), 1)
    })
  })
  return (
    <group ref={root}>
      <group ref={frame}>
        <Body size={[5.25, 3.45, 0.16]} color="#434343" />
      </group>
      <group ref={brand}>
        {art ? (
          <Surface texture={art.brand} width={1.12} height={0.448} position={[0, 0, 0.02]} />
        ) : (
          <Label text="DECK’D" width={1.05} height={0.3} position={[0, 0, 0.02]} />
        )}
      </group>
      {['LIBRARY · 8 GAMES', 'PLAYTIME · THIS WEEK', 'YOUR NEXT GAME'].map((name, i) => (
        <group
          key={name}
          ref={(r) => {
            panels.current[i] = r
          }}
        >
          <Body size={i === 0 ? [1.95, 2.8, 0.075] : [2.55, 1.3, 0.075]} color="#777777">
            {art && i > 0 ? (
              <Surface
                texture={art.panels[i === 1 ? 'playtime' : 'next']}
                width={2.48}
                height={1.23}
                position={[0, 0, 0.045]}
              />
            ) : (
              <Label
                text={name}
                width={i === 0 ? 1.7 : 2.3}
                height={0.25}
                position={[0, i === 0 ? 1.07 : 0.42, 0.044]}
              />
            )}
            {i === 1 && !art && <Bars kind={1} />}
          </Body>
        </group>
      ))}
    </group>
  )
}
function Plaques() {
  const refs = useRef([])
  const { sceneProgress } = useMasterTimeline()
  useFrame(() => {
    const p = sceneProgress.get()
    const about = interval(p, 0.15, 0.18) * (1 - interval(p, 0.28, 0.33))
    const cross = interval(p, 0.78, 0.8) * (1 - interval(p, 0.86, 0.89))
    refs.current.forEach((r, i) => {
      const a = [
        [1.6, 1.55, -1.9],
        [5.2, -1.9, 0],
        [4.7, 2.25, -4],
        [0.9, -1.6, -3],
      ][i]
      const b = [
        [1.0, -1.8, 1],
        [4.8, -1.95, -0.2],
        [5.9, -0.75, -1.5],
        [1.3, -2.1, -1],
      ][i]
      r.position.set(...a.map((v, j) => lerp(v, b[j], cross)))
      r.position.y -= 6 * (1 - Math.max(about, cross))
    })
  })
  return ['STEAM', 'EPIC', 'GOG', 'XBOX'].map((name, i) => (
    <group
      key={name}
      ref={(r) => {
        refs.current[i] = r
      }}
      rotation={[0.08, i % 2 ? -0.15 : 0.12, 0]}
    >
      <Body size={[0.85, 0.32, 0.075]} />
      <Label text={name} width={0.77} height={0.22} position={[0, 0, 0.042]} />
    </group>
  ))
}
function Terrain() {
  const art = useContext(ArtContext)
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.6, 0]} receiveShadow>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial color={art ? '#171e24' : '#323232'} roughness={1} />
      </mesh>
      {[
        [2, -3.2, -1, 12, 1.1, 6],
        [-7, -3.1, 4, 9, 1.8, 3],
        [8, -3.3, 3, 8, 1.4, 4],
        [5, -3.3, -13, 22, 3, 7],
      ].map((v, i) => (
        <mesh
          key={i}
          position={v.slice(0, 3)}
          rotation={[0, i * 0.24, -0.035]}
          scale={v.slice(3)}
          castShadow
          receiveShadow
        >
          <icosahedronGeometry args={[1, 1]} />
          <meshStandardMaterial
            color={art ? (i === 3 ? '#26313a' : '#1c252d') : i === 3 ? '#414141' : '#292929'}
            flatShading
            roughness={1}
          />
        </mesh>
      ))}
    </group>
  )
}
function World({ polished = false }) {
  return (
    <>
      <color attach="background" args={[polished ? '#10171e' : '#202020']} />
      <Terrain />
      <Cards />
      <Rig />
      <Product />
      <Plaques />
    </>
  )
}
function MaterialWorld() {
  const covers = useTexture(
    slugs.map((slug) =>
      slug === 'hades' ? hadesUrl : coverFiles[`../../../../assets/landing/covers/${slug}.webp`]
    )
  )
  const brand = useTexture(brandUrl)
  useEffect(() => {
    ;[...covers, brand].forEach((t) => {
      t.colorSpace = SRGBColorSpace
      t.anisotropy = 4
      t.needsUpdate = true
    })
  }, [covers, brand])
  const panels = useMemo(
    () =>
      Object.fromEntries(
        ['track', 'understand', 'recommend', 'selected', 'playtime', 'next'].map((k) => [
          k,
          panelTexture(k),
        ])
      ),
    []
  )
  useEffect(() => () => Object.values(panels).forEach((t) => t.dispose()), [panels])
  const art = useMemo(() => ({ covers, brand, panels }), [covers, brand, panels])
  return (
    <ArtContext.Provider value={art}>
      <World polished />
    </ArtContext.Provider>
  )
}
export default function PrevisWorld({ polished = false }) {
  return polished ? <MaterialWorld /> : <World />
}
