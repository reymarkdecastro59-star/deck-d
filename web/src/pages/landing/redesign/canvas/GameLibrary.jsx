import { createRef, useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import { MathUtils, SRGBColorSpace, Vector3 } from 'three'
import { useMasterTimeline } from '../hooks/useMasterTimeline'
import { PHASE_ORDER, phaseIndex, progressInPhase, smoothstep, lerp } from '../hooks/timelinePhases'
import { createCoverMaterial, disposeCoverMaterial } from './coverMaterial'
import manifest from '../../../../assets/landing/covers/covers.json'

const textureModules = import.meta.glob('../../../../assets/landing/covers/*.webp', {
  eager: true,
  as: 'url',
})

const FULL_CROP = [0, 0, 1, 1]
const STRIP_CROP = [0, 0.35, 1, 0.3]
const TILE_CROP = [0.3, 0.4, 0.4, 0.4]

function clamp01(value) {
  return MathUtils.clamp(value, 0, 1)
}

function resolveTextureUrls() {
  return manifest.covers.map((cover) => {
    const path = `../../../../assets/landing/covers/${cover.file}`
    const textureUrl = textureModules[path]

    if (!textureUrl) throw new Error(`Missing landing cover texture: ${cover.file}`)
    return textureUrl
  })
}

function coverTarget(pos, rot, scale, crop, opacity) {
  return { pos, rot, scale, crop, opacity }
}

function computeFormations(n) {
  const home = []
  const about = []
  const how = []
  const features = []
  const contact = []

  for (let i = 0; i < n; i += 1) {
    const column = i % 3
    const row = Math.floor(i / 3)
    const fanOffset = i - (n - 1) / 2
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2
    const contactPosition = new Vector3(Math.cos(angle), Math.sin(angle), 0).multiplyScalar(3.4)

    home.push(
      coverTarget(
        [fanOffset * 0.08, fanOffset * 0.025, -i * 0.02],
        [0, 0, fanOffset * 0.035],
        1,
        FULL_CROP,
        1
      )
    )
    about.push(coverTarget([(column - 1) * 1.4, (1 - row) * 2.1, -0.2], [0, 0, 0], 1, FULL_CROP, 1))
    how.push(coverTarget([(column - 1) * 1.8, (1 - row) * 1.6, -0.4], [0, 0, 0], 1, STRIP_CROP, 1))
    features.push(
      coverTarget([(column - 1) * 1.0, 0.3 + (1 - row) * 1.0, -0.25], [0, 0, 0], 0.9, TILE_CROP, 1)
    )
    contact.push(
      coverTarget(
        [contactPosition.x, contactPosition.y, 4.8 + (i % 3) * 0.18],
        [0, 0, angle * 0.08],
        0.8,
        FULL_CROP,
        0.15
      )
    )
  }

  return { home, about, how, features, contact }
}

export default function GameLibrary() {
  const { scrollProgress } = useMasterTimeline()
  const groupRef = useRef()
  const meshRefs = useMemo(() => manifest.covers.map(() => createRef()), [])
  const materials = useMemo(() => manifest.covers.map(() => createCoverMaterial()), [])
  const materialsRef = useRef(materials)
  const textureUrls = useMemo(() => resolveTextureUrls(), [])
  const textures = useTexture(textureUrls)
  const formations = useMemo(() => computeFormations(manifest.covers.length), [])

  if (manifest.covers.length !== 9) {
    console.warn(`GameLibrary expected 9 covers, received ${manifest.covers.length}`)
  }

  useEffect(() => {
    textures.forEach((texture, index) => {
      texture.colorSpace = SRGBColorSpace
      texture.anisotropy = 8
      texture.needsUpdate = true
      materialsRef.current[index].uniforms.uMap.value = texture
    })
  }, [textures])

  useEffect(
    () => () => {
      materialsRef.current.forEach(disposeCoverMaterial)
    },
    []
  )

  useFrame(() => {
    const progress = clamp01(scrollProgress?.get?.() ?? 0)
    const currentIndex = phaseIndex(progress)
    const currentKey = PHASE_ORDER[currentIndex]
    const nextKey = PHASE_ORDER[Math.min(currentIndex + 1, PHASE_ORDER.length - 1)]
    const transition = smoothstep(progressInPhase(progress, currentKey))

    for (let i = 0; i < manifest.covers.length; i += 1) {
      const from = formations[currentKey][i]
      const to = formations[nextKey][i]
      const mesh = meshRefs[i].current
      if (!mesh) continue

      mesh.position.set(
        lerp(from.pos[0], to.pos[0], transition),
        lerp(from.pos[1], to.pos[1], transition),
        lerp(from.pos[2], to.pos[2], transition)
      )
      mesh.rotation.set(
        lerp(from.rot[0], to.rot[0], transition),
        lerp(from.rot[1], to.rot[1], transition),
        lerp(from.rot[2], to.rot[2], transition)
      )

      const scale = lerp(from.scale, to.scale, transition)
      mesh.scale.setScalar(scale)

      const material = materialsRef.current[i]
      const crop = material.uniforms.uCrop.value
      crop.set(
        lerp(from.crop[0], to.crop[0], transition),
        lerp(from.crop[1], to.crop[1], transition),
        lerp(from.crop[2], to.crop[2], transition),
        lerp(from.crop[3], to.crop[3], transition)
      )
      material.uniforms.uOpacity.value = lerp(from.opacity, to.opacity, transition)
    }
  })

  return (
    <group ref={groupRef}>
      {manifest.covers.map((cover, index) => (
        <mesh key={cover.slug} ref={meshRefs[index]} renderOrder={2}>
          <planeGeometry args={[1, 1.5]} />
          <primitive attach="material" object={materials[index]} />
        </mesh>
      ))}
    </group>
  )
}
