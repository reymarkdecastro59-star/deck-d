import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { QuadraticBezierLine } from '@react-three/drei'
import { Vector3 } from 'three'
import { useMasterTimeline } from '../hooks/useMasterTimeline'
import { PHASE_ORDER, phaseIndex, progressInPhase, smoothstep } from '../hooks/timelinePhases'
import { lerpAnchor } from './coverAnchors'

const EDGES = [
  [0, 1],
  [1, 2],
  [3, 4],
  [4, 5],
  [6, 7],
  [7, 8],
  [0, 3],
  [3, 6],
  [1, 4],
  [4, 7],
  [2, 5],
  [5, 8],
]
const SAMPLE_COUNT = 32

function currentAnchor(index, progress) {
  const currentIndex = phaseIndex(progress)
  const currentKey = PHASE_ORDER[currentIndex]
  const nextKey = PHASE_ORDER[Math.min(currentIndex + 1, PHASE_ORDER.length - 1)]
  return lerpAnchor(currentKey, nextKey, index, smoothstep(progressInPhase(progress, currentKey)))
}

function curvePoints(start, mid, end) {
  return Array.from({ length: SAMPLE_COUNT }, (_, index) => {
    const t = index / (SAMPLE_COUNT - 1)
    const inverseT = 1 - t
    return new Vector3(
      inverseT * inverseT * start.x + 2 * inverseT * t * mid.x + t * t * end.x,
      inverseT * inverseT * start.y + 2 * inverseT * t * mid.y + t * t * end.y,
      inverseT * inverseT * start.z + 2 * inverseT * t * mid.z + t * t * end.z
    )
  })
}

function edgeGeometry(edge, progress) {
  const a = currentAnchor(edge[0], progress)
  const b = currentAnchor(edge[1], progress)
  const mid = {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    z: (a.z + b.z) / 2 - 0.4,
  }
  return { a, b, mid }
}

export default function RecommendationLattice() {
  const { scrollProgress, transition } = useMasterTimeline()
  const groupRef = useRef()
  const lineRefs = useRef([])
  const initialEdges = useMemo(() => EDGES.map((edge) => edgeGeometry(edge, 0)), [])

  useFrame(() => {
    const progress = scrollProgress?.get?.() ?? 0
    const recompositionProgress = transition.recomposition?.get?.() ?? 0
    const opacity = smoothstep((progress - 0.54) / 0.06) * smoothstep((0.82 - progress) / 0.08)
    const group = groupRef.current

    if (!group) return
    group.visible = opacity >= 0.01
    if (!group.visible) return

    EDGES.forEach((edge, index) => {
      const line = lineRefs.current[index]
      if (!line) return

      const { a, b, mid } = edgeGeometry(edge, progress)
      const points = curvePoints(a, mid, b)
      const stagger = smoothstep((recompositionProgress - index * 0.0625) / 0.25)
      line.geometry.setPositions(points.flatMap((point) => [point.x, point.y, point.z]))
      line.material.opacity = opacity * stagger
      line.material.transparent = true
      line.geometry.computeBoundingSphere()
    })
  })

  return (
    <group ref={groupRef} visible={false}>
      {EDGES.map((edge, index) => {
        const { a, b, mid } = initialEdges[index]
        return (
          <QuadraticBezierLine
            key={`${edge[0]}-${edge[1]}`}
            ref={(line) => {
              lineRefs.current[index] = line
            }}
            start={[a.x, a.y, a.z]}
            end={[b.x, b.y, b.z]}
            mid={[mid.x, mid.y, mid.z]}
            color="#4c7dff"
            lineWidth={1.2}
            transparent
            opacity={0}
          />
        )
      })}
    </group>
  )
}
