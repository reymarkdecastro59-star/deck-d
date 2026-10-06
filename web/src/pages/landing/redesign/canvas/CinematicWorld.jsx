import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import { Color, SRGBColorSpace } from 'three'
import { useMasterTimeline } from '../hooks/useMasterTimeline'
import { interval, lerp, sample, lifecycle, featureLifecycle } from '../hooks/timelinePhases'
import { setGroupOpacity } from './sceneLifecycle'
import { dashboardPose, dockPose } from './sceneMath'
import { uiTexture, dashboardState } from './sceneTextures'
import { Slab, Face } from './PhysicalSlab'
import RockTerrain from './RockTerrain'
import FeatureObjects from './FeatureObjects'
import hadesKeyart from '../../../../assets/landing/covers/hades-keyart.jpg'
import manifest from '../../../../assets/landing/covers/covers.json'
const urls = import.meta.glob('../../../../assets/landing/covers/*.webp', {
  eager: true,
  query: '?url',
  import: 'default',
})
const covers = manifest.covers.map((c) =>
  c.slug === 'hades' ? hadesKeyart : urls[`../../../../assets/landing/covers/${c.file}`]
)
useTexture.preload(covers)
const aboutPositions = [
  [2.45, -0.12, 1],
  [4.65, 0.28, -0.5],
  [2.15, 2.1, -3],
  [0.8, -1.7, 0.5],
  [5.5, 2.55, -4],
  [0.25, 2.9, -4],
  [6, -2.3, -2],
  [-3.1, -3.5, 3.2],
  [4.8, -0.5, -5],
]
function pose(ref, values) {
  if (!ref) return
  ref.position.set(...values.slice(0, 3))
  ref.rotation.set(...values.slice(3, 6))
  ref.scale.setScalar(values[6] ?? 1)
}
function Game({ index, texture, reduced }) {
  const ref = useRef()
  const { sceneProgress: scrollProgress, intro } = useMasterTimeline()
  useFrame(() => {
    const p = scrollProgress.get()
    const i = index
    const a = aboutPositions[i]
    const entry = p < 0.025 ? intro.get() : 1
    const home =
      i < 5
        ? [
            2.12 + i * lerp(0.06, 0.36, entry),
            -0.34 + i * 0.06,
            0.8 - i * lerp(0.08, 0.28, entry),
            0.045,
            -0.23 + i * 0.025,
            -0.09 + i * 0.015,
            1.12,
          ]
        : [8 + i, 2, -12, 0, -0.2, 0, 0.6]
    const library = [
      ...a,
      0.06,
      ((i % 3) - 1) * 0.17,
      (i % 2 ? 1 : -1) * 0.14,
      i === 0 ? 1.05 : i === 7 ? 1.1 : 0.65,
    ]
    // A shared destination gradually replaces the scattered library hierarchy.
    const ordered = [
      2.25 + (i % 3) * 1.15,
      1.55 - Math.floor(i / 3) * 1.4,
      -1.4 - Math.floor(i / 3) * 0.55,
      0.04,
      -0.12,
      0,
      i === 0 ? 0.72 : 0.46,
    ]
    let v = sample(p, [
      [0, ...home],
      [0.12, ...home],
      [0.225, ...library],
      [0.28, ...ordered],
      [0.315, ...ordered],
      [0.39, a[0] + 2, a[1] + 0.7, -13, 0.08, 1.4, 0.12, 0.6],
      [1, a[0] + 2, a[1] + 0.7, -13, 0.08, 1.4, 0.12, 0.6],
    ])
    if (i === 0)
      v = sample(p, [
        [0, ...home],
        [0.025, ...home],
        [0.13, ...home],
        [0.17, reduced ? 2.2 : 0.35, 0.1, reduced ? 1 : 7.1, 0.08, -0.38, -0.13, 1.12],
        [0.222, ...library],
        [0.28, ...ordered],
        [0.312, ...ordered],
        [0.351, 2.8, 0.5, 1, 0.1, 1.48, 0.02, 0.95],
        [0.386, 3.2, 1, -4, 0.1, 1.48, 0.02, 0.95],
        [0.42, 5, 2, -14, 0.1, 1.48, 0.02, 0.95],
        [1, 5, 2, -14, 0.1, 1.48, 0.02, 0.95],
      ])
    if (i === 3 && p >= 0.39) {
      const dock = dockPose(p)
      v = sample(p, [
        [0.39, 5, -2, -14, 0, -0.4, -0.1, 0.68],
        [0.499, 4.5, -1.1, -2, 0, -0.32, -0.07, 0.68],
        [0.53, 4.65, -0.22, 0.55, 0, -0.08, -0.02, 0.52],
        [0.55, 4.65, -0.22, 0.55, 0, -0.08, -0.02, 0.52],
        [0.602, ...dock],
      ])
      if (p >= 0.602) v = dock
    }
    if ((i === 4 || i === 5) && p >= 0.48)
      v = sample(p, [
        [0.48, 5 + (i - 4), -0.4, -12, 0, -0.3, 0, 0.5],
        [0.514, 2 + (i - 4) * 2, -0.3, -0.5 - (i - 4), 0.04, -0.25, 0.08, 0.48],
        [0.527, 2 + (i - 4) * 2, -0.3, -0.5 - (i - 4), 0.04, -0.25, 0.08, 0.48],
        [0.546, 2 + (i - 4) * 2, -0.15, -3.2 - (i - 4), 0.04, -0.55, 0.08, 0.42],
        [0.556, 2 + (i - 4) * 2, -0.15, -3.2 - (i - 4), 0.04, -0.55, 0.08, 0.42],
      ])
    const libraryOpacity = (i > 4 ? interval(p, 0.13, 0.22) : 1) * (1 - interval(p, 0.345, 0.39))
    const candidateOpacity =
      i === 3
        ? lifecycle(p, 0.49, 0.86, 0.012).opacity
        : i === 4 || i === 5
          ? lifecycle(p, 0.49, 0.556, 0.012).opacity
          : 0
    setGroupOpacity(ref.current, i === 7 ? 0 : Math.max(libraryOpacity, candidateOpacity))
    pose(ref.current, v)
  })
  return (
    <group ref={ref} visible={false}>
      <Slab>
        <Face texture={texture} />
      </Slab>
    </group>
  )
}
function SessionModules({ textures }) {
  const refs = useRef([]),
    dataRef = useRef(),
    spine = useRef()
  const { sceneProgress: scrollProgress } = useMasterTimeline()
  useFrame(() => {
    const p = scrollProgress.get()
    setGroupOpacity(spine.current, lifecycle(p, 0.35, 0.568, 0.025).opacity)
    refs.current.forEach((r, i) => {
      const focus = interval(p, [0.36, 0.432, 0.492][i], [0.388, 0.455, 0.518][i])
      const leave = interval(p, [0.425, 0.485, 0.55][i], [0.447, 0.507, 0.588][i])
      const handoff = interval(p, 0.548, 0.604)
      setGroupOpacity(
        r,
        lifecycle(p, 0.335 + i * 0.007, 0.592, 0.024).opacity * (1 - interval(p, 0.548, 0.568))
      )
      r.position.set(
        3.15 - handoff * 0.6,
        1.65 - i * 1.8 + leave * 0.15 + handoff * 2,
        -2.6 + (focus - leave) * 3 - handoff * 2
      )
      r.rotation.set(0.04, -0.24, 0.015)
    })
    setGroupOpacity(dataRef.current, lifecycle(p, 0.333, 0.393, 0.014).opacity)
    pose(
      dataRef.current,
      sample(p, [
        [0.333, 2.65, 0.1, 1, 0, 1.4, 0, 0.38],
        [0.373, 3.02, 1.05, 1.4, 0, -0.13, 0, 0.48],
        [0.39, 3.02, 1.05, -0.1, 0, -0.13, 0, 0.48],
        [0.449, 3.25, -0.2, -1, 0, 0, 0, 0.22],
      ])
    )
  })
  return (
    <group>
      <group ref={spine} position={[3.15, -0.15, -2.83]} rotation={[0.04, -0.24, 0.015]}>
        <Slab size={[0.06, 4.7, 0.08]} color="#263343" />
      </group>
      {['track', 'understand', 'recommend'].map((name, i) => (
        <group
          key={name}
          ref={(r) => {
            refs.current[i] = r
          }}
        >
          <Slab size={[3.25, 1.82, 0.16]}>
            <Face texture={textures[name]} width={3.17} height={1.74} z={0.089} />
          </Slab>
        </group>
      ))}
      <group ref={dataRef}>
        <Slab size={[2.5, 1.45, 0.06]}>
          <Face texture={textures.session} width={2.44} height={1.4} z={0.034} />
        </Slab>
      </group>
    </group>
  )
}
function Product({ textures }) {
  const root = useRef(),
    layers = useRef([]),
    face = useRef(),
    brand = useRef(),
    faceMat = useRef(),
    brandMat = useRef(),
    stateMaterials = useRef([])
  const { sceneProgress: scrollProgress } = useMasterTimeline()
  useFrame(() => {
    const p = scrollProgress.get()
    const d = dashboardPose(p),
      collapse = interval(p, 0.845, 0.921)
    root.current.visible = p > 0.568
    root.current.position.set(...d.position)
    root.current.rotation.set(...d.rotation)
    layers.current.forEach((r, i) => {
      const separate = interval(p, 0.83, 0.856) * (1 - interval(p, 0.89, 0.925))
      r.position.set(
        i * 0.065 * collapse,
        i * 0.035 * collapse + (i - 1) * separate * 0.065,
        -i * (0.028 + 0.065 * collapse) - separate * i * 0.035
      )
      r.scale.set(lerp(1, 0.43, collapse), lerp(1, 0.88, collapse), 1)
    })
    face.current.visible = p < 0.895
    faceMat.current.opacity = 1 - interval(p, 0.835, 0.876)
    stateMaterials.current.forEach((m, i) => {
      const emphasis =
        i === 2
          ? interval(p, 0.786, 0.792) * (1 - interval(p, 0.825, 0.835))
          : featureLifecycle(p, i + 1).opacity
      m.opacity = emphasis * faceMat.current.opacity
      m.depthWrite = false
    })
    brand.current.visible = p > 0.858
    brandMat.current.opacity = interval(p, 0.864, 0.918)
    brand.current.position.z = 0.15
  })
  return (
    <group ref={root} visible={false}>
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <group
          key={i}
          ref={(r) => {
            layers.current[i] = r
          }}
        >
          <Slab size={[5.8, 4.1, 0.055]} color={i ? '#202d3d' : '#101b2d'} />
        </group>
      ))}
      <group ref={face}>
        <Face
          texture={textures.dashboard}
          width={5.68}
          height={3.98}
          z={0.079}
          materialRef={faceMat}
        />
        {['playtime', 'recommendations', 'customize'].map((name, i) => (
          <Face
            key={name}
            texture={textures['dashboard-' + name]}
            width={5.68}
            height={3.98}
            z={0.085 + i * 0.003}
            materialRef={(m) => {
              stateMaterials.current[i] = m
            }}
          />
        ))}
      </group>
      <group ref={brand}>
        <Face texture={textures.brand} width={2.1} height={1.5} z={0.06} materialRef={brandMat} />
      </group>
    </group>
  )
}
function DeckShadow() {
  const ref = useRef()
  const { sceneProgress } = useMasterTimeline()
  const uniforms = useMemo(() => ({ opacity: { value: 0 } }), [])
  useFrame(() => {
    const p = sceneProgress.get()
    const home = 1 - interval(p, 0.13, 0.22)
    const end = interval(p, 0.865, 0.925)
    ref.current.visible = home + end > 0.001
    ref.current.material.uniforms.opacity.value = (home + end) * 0.22
    ref.current.position.set(lerp(2.65, 2.85, end), -2.92, 0)
    ref.current.scale.set(lerp(3.7, 3.1, end), 1.8, 1)
  })
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        transparent
        depthWrite={false}
        uniforms={uniforms}
        vertexShader="varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}"
        fragmentShader="varying vec2 vUv; uniform float opacity; void main(){float r=length((vUv-.5)*2.);gl_FragColor=vec4(.025,.035,.05,(1.-smoothstep(.12,1.,r))*opacity);}"
      />
    </mesh>
  )
}
export default function CinematicWorld() {
  const presentation = useRef()
  const maps = useTexture(covers)
  const { size } = useThree()
  const { reducedMotion } = useMasterTimeline()
  useEffect(() => {
    maps.forEach((t) => {
      t.colorSpace = SRGBColorSpace
      t.anisotropy = 4
      t.needsUpdate = true
    })
  }, [maps])
  const textures = useMemo(() => {
    const result = Object.fromEntries(
      [
        'dashboard',
        'brand',
        'brand-hub',
        'track',
        'understand',
        'recommend',
        'session',
        ...['Steam', 'Epic', 'GOG', 'Xbox'].map((p) => 'platform:' + p),
      ].map((k) => [
        k,
        uiTexture(
          k,
          maps.map((t) => t.image)
        ),
      ])
    )
    ;['playtime', 'recommendations', 'customize'].forEach((name) => {
      result['dashboard-' + name] = dashboardState(result.dashboard, name)
    })
    return result
  }, [maps])
  useEffect(() => () => Object.values(textures).forEach((t) => t.dispose()), [textures])
  const mobile = size.width < 700
  // Keep the approved editorial framing while the camera explores the world.
  // Objects retain their local depth choreography and perspective, independent of terrain.
  useFrame(({ camera }) => {
    presentation.current.quaternion.copy(camera.quaternion)
    presentation.current.position
      .set(0, -0.1, -10)
      .applyQuaternion(camera.quaternion)
      .add(camera.position)
  }, -1)
  return (
    <group ref={presentation}>
      <group
        position={mobile ? [-1.57, -1.42, 0] : [0, 0, 0]}
        scale={mobile ? 0.5 : Math.min(1, size.width / size.height / 1.78)}
      >
        <DeckShadow />
        {maps.map(
          (t, i) =>
            (!mobile || i < 6) && <Game key={i} index={i} texture={t} reduced={reducedMotion} />
        )}
        <SessionModules textures={textures} />
        <Product textures={textures} />
        <FeatureObjects textures={textures} covers={maps} />
      </group>
    </group>
  )
}
export function Environment() {
  const { sceneProgress: scrollProgress } = useMasterTimeline()
  const back = useRef()
  const colors = useMemo(
    () => ['#050a11', '#091727', '#152337', '#081322', '#040911'].map((c) => new Color(c)),
    []
  )
  const uniforms = useMemo(() => ({ uColor: { value: new Color('#050a11') } }), [])
  useFrame(({ scene }) => {
    const p = scrollProgress.get(),
      v = sample(p, [
        [0, 0],
        [0.24, 1],
        [0.43, 2],
        [0.61, 3],
        [0.94, 4],
      ])
    const i = Math.floor(v[0]),
      j = Math.min(i + 1, 4)
    back.current.uniforms.uColor.value.copy(colors[i]).lerp(colors[j], v[0] - i)
    const quiet = interval(p, 0.835, 0.94)
    scene.fog.near = lerp(30, 18, quiet)
    scene.fog.far = lerp(78, 58, quiet)
  })
  return (
    <group>
      <mesh position={[0, 0, -58]}>
        <planeGeometry args={[180, 100]} />
        <shaderMaterial
          ref={back}
          uniforms={uniforms}
          vertexShader={
            'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}'
          }
          fragmentShader={`
            varying vec2 vUv;
            uniform vec3 uColor;
            float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
            float noise(vec2 p){
              vec2 i=floor(p),f=fract(p); f=f*f*(3.0-2.0*f);
              return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),
                mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
            }
            void main(){
              vec2 d=(vUv-vec2(.59,.5))*vec2(1.3,1.0);
              float glow=exp(-dot(d,d)*28.0);
              float cloud=noise(vUv*vec2(8.,19.))*0.7+noise(vUv*vec2(17.,31.))*0.3;
              float haze=exp(-pow((vUv.y-.46)*12.,2.));
              vec3 c=uColor+vec3(.018,.03,.055)*glow;
              c+=vec3(.008,.011,.015)*haze*(.5+cloud*.5);
              c+=vec3(.003,.004,.006)*(cloud-.5);
              gl_FragColor=vec4(c,1.0);
              #include <tonemapping_fragment>
              #include <colorspace_fragment>
            }`}
        />
      </mesh>
      <RockTerrain />
    </group>
  )
}
