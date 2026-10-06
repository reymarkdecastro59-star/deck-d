import { useMemo, useRef } from 'react'
import { QuadraticBezierCurve3, Vector3 } from 'three'
import { useFrame } from '@react-three/fiber'
import { Line } from '@react-three/drei'
import { Slab, Face } from './PhysicalSlab'
import { useMasterTimeline } from '../hooks/useMasterTimeline'
import { featureLifecycle, interval } from '../hooks/timelinePhases'
import { setGroupOpacity } from './sceneLifecycle'
import { importPose, LAUNCHER_POSITIONS, HUB_POSITION, IMPORT_BEATS } from './importMotion'

const platforms = ['Steam', 'Epic', 'GOG', 'Xbox']
const positions = LAUNCHER_POSITIONS

function ImportedGame({ texture, index }) {
  const ref = useRef()
  const { sceneProgress } = useMasterTimeline()
  useFrame(() => {
    const p = sceneProgress.get()
    const pose = importPose(p, index)
    const start = IMPORT_BEATS[index][0]
    setGroupOpacity(
      ref.current,
      interval(p, start, start + 0.003) *
        (1 - interval(p, 0.835, 0.876)) *
        (1 - featureLifecycle(p, 1).opacity) *
        (1 - interval(p, 0.786, 0.792) * (1 - interval(p, 0.825, 0.835)))
    )
    ref.current.position.set(...pose.position)
    ref.current.rotation.set(...pose.rotation)
    ref.current.scale.setScalar(pose.scale)
  })
  return (
    <group ref={ref} visible={false}>
      <Slab>
        <Face texture={texture} />
      </Slab>
    </group>
  )
}

export default function FeatureObjects({ textures, covers }) {
  const { sceneProgress } = useMasterTimeline()
  const hub = useRef(),
    plaqueMaterials = useRef([])
  const paths = useMemo(
    () =>
      positions.map((p) =>
        new QuadraticBezierCurve3(
          new Vector3(...p),
          new Vector3(p[0] * 0.35, p[1] * 0.1, -0.18),
          new Vector3(0, 0, -0.04)
        ).getPoints(20)
      ),
    []
  )
  useFrame(() => {
    const p = sceneProgress.get()
    const opacity = featureLifecycle(p, 3).opacity
    setGroupOpacity(hub.current, opacity)
    hub.current.position.set(...HUB_POSITION)
    plaqueMaterials.current.forEach((material, i) => {
      const beat = IMPORT_BEATS[i]
      const active = beat
        ? interval(p, beat[0], beat[0] + 0.004) * (1 - interval(p, beat[0] + 0.016, beat[1]))
        : 0
      material.emissiveIntensity = 0.48 + active * 0.22
    })
  })
  return (
    <group>
      <group ref={hub} visible={false}>
        <group scale={0.65}>
          {[2, 1, 0].map((i) => (
            <group key={i} position={[i * 0.055, i * 0.035, -i * 0.09]}>
              <Slab size={[0.8, 0.98, 0.07]}>
                <Face texture={textures['brand-hub']} width={0.7} height={0.52} z={0.043} />
              </Slab>
            </group>
          ))}
        </group>
        {platforms.map((name, i) => (
          <group key={name}>
            <Line
              points={paths[i]}
              color="#394a5e"
              lineWidth={0.65}
              transparent
              opacity={0}
              depthWrite={false}
            />
            <group position={positions[i]}>
              <Slab size={[0.98, 0.56, 0.085]} color="#192330">
                <Face
                  texture={textures['platform:' + name]}
                  width={0.83}
                  height={0.42}
                  z={0.052}
                  materialRef={(m) => {
                    plaqueMaterials.current[i] = m
                  }}
                />
              </Slab>
            </group>
          </group>
        ))}
      </group>
      {covers.slice(0, 2).map((texture, i) => (
        <ImportedGame key={i} texture={texture} index={i} />
      ))}
    </group>
  )
}
