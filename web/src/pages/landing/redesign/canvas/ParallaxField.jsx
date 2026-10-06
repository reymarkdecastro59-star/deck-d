import { useMemo } from 'react'

// Deep, world-fixed particle layer whose sole job is to *prove the camera is
// moving*. Covers reorganize between phases so parallax against them cancels
// out. A static field of points at multiple depths gives an unambiguous
// reference: when the camera pans, near dots streak faster than far ones.
//
// DEPTH BUDGET: the canvas fog runs linearly from distance 6 → 32 (see
// LandingCanvas.jsx). Camera z is 6.8 ± ~3, so anything at world z < −18 is
// already ≥25 units from camera and fading heavily. Placing points too far
// makes them invisible (which is what killed the first pass of this file).
// The layers below all sit within the readable fog window.

function makePositions(count, xSpread, ySpread, zNear, zFar) {
  const arr = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    arr[i * 3 + 0] = (Math.random() - 0.5) * xSpread
    arr[i * 3 + 1] = (Math.random() - 0.5) * ySpread
    arr[i * 3 + 2] = -(zNear + Math.random() * (zFar - zNear))
  }
  return arr
}

export default function ParallaxField() {
  // Near layer — big/bright, moves fastest under camera translation.
  const nearPositions = useMemo(() => makePositions(400, 22, 14, 1, 6), [])
  // Mid layer — the workhorse parallax layer.
  const midPositions = useMemo(() => makePositions(700, 34, 22, 6, 12), [])
  // Far layer — slow, distant, sits near the fog fade edge.
  const farPositions = useMemo(() => makePositions(500, 48, 30, 12, 18), [])

  return (
    <group>
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[nearPositions, 3]}
            count={nearPositions.length / 3}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.09}
          sizeAttenuation
          color="#d4dcff"
          transparent
          opacity={0.9}
          depthWrite={false}
        />
      </points>
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[midPositions, 3]}
            count={midPositions.length / 3}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.07}
          sizeAttenuation
          color="#8faaff"
          transparent
          opacity={0.85}
          depthWrite={false}
        />
      </points>
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[farPositions, 3]}
            count={farPositions.length / 3}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.055}
          sizeAttenuation
          color="#4c7dff"
          transparent
          opacity={0.7}
          depthWrite={false}
        />
      </points>
    </group>
  )
}
