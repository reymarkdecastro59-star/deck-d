import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Line } from '@react-three/drei'
import { CatmullRomCurve3, Vector3 } from 'three'
import { useMasterTimeline } from '../hooks/useMasterTimeline'
import { PHASE_ORDER, phaseIndex, progressInPhase, smoothstep } from '../hooks/timelinePhases'
import { lerpAnchor } from './coverAnchors'

const COVER_COUNT = 9
const SAMPLE_COUNT = 32

function currentAnchor(index, progress) {
  const currentIndex = phaseIndex(progress)
  const currentKey = PHASE_ORDER[currentIndex]
  const nextKey = PHASE_ORDER[Math.min(currentIndex + 1, PHASE_ORDER.length - 1)]
  return lerpAnchor(currentKey, nextKey, index, smoothstep(progressInPhase(progress, currentKey)))
}

function tracePoints(anchor) {
  const start = new Vector3(anchor.x, anchor.y - 0.75, anchor.z)
  const mid = start.clone().add(new Vector3(0, -1.5, 0))
  const end = start.clone().add(new Vector3(0, -3, 0))
  return new CatmullRomCurve3([start, mid, end]).getPoints(SAMPLE_COUNT - 1)
}

export default function SessionTraces() {
  const { scrollProgress, transition } = useMasterTimeline()
  const groupRef = useRef()
  const lineRefs = useRef([])
  const initialPoints = useMemo(() => tracePoints(currentAnchor(0, 0)), [])

  useFrame(() => {
    const progress = scrollProgress?.get?.() ?? 0
    const extractionProgress = transition.extraction?.get?.() ?? 0
    const opacity = smoothstep((progress - 0.32) / 0.12) * smoothstep((0.6 - progress) / 0.12)
    const group = groupRef.current

    if (!group) return
    group.userData.extractionProgress = extractionProgress
    group.visible = opacity >= 0.01
    if (!group.visible) return

    for (let index = 0; index < COVER_COUNT; index += 1) {
      const line = lineRefs.current[index]
      if (!line) continue

      const points = tracePoints(currentAnchor(index, progress))
      line.geometry.setPositions(points.flatMap((point) => [point.x, point.y, point.z]))
      line.material.opacity = opacity
      line.material.transparent = true
      line.geometry.computeBoundingSphere()
    }
  })

  return (
    <group ref={groupRef} visible={false}>
      {Array.from({ length: COVER_COUNT }, (_, index) => (
        <Line
          key={index}
          ref={(line) => {
            lineRefs.current[index] = line
          }}
          points={initialPoints}
          color="#22d3ee"
          lineWidth={1.5}
          transparent
          opacity={0}
        />
      ))}
    </group>
  )
}
