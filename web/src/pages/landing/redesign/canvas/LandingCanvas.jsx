import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { COLORS } from '../tokens'

// Fixed R3F canvas that sits behind all HTML content.
// pointer-events: none so scroll/clicks pass through to the DOM.
// Lazy-loaded from Landing.jsx via React.lazy so it doesn't block LCP.
//
// The scene is intentionally empty for the shell. Section scenes will be
// added and controlled by scroll progress in subsequent commits.

export default function LandingCanvas({ scrollProgress: _scrollProgress }) {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0" style={{ zIndex: 1 }}>
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 5], fov: 45 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        style={{ background: 'transparent' }}
      >
        {/* Ambient scene lighting — soft blue rim tint matches DECK'D palette */}
        <color attach="background" args={[COLORS.bgDeep]} />
        <fog attach="fog" args={[COLORS.bgDeep, 4, 16]} />
        <ambientLight intensity={0.35} />
        <directionalLight position={[3, 4, 5]} intensity={0.6} color="#8faaff" />
        <directionalLight position={[-4, -2, 2]} intensity={0.2} color="#4c7dff" />

        <Suspense fallback={null}>{/* Section scenes go here (§1 HOME onwards). */}</Suspense>
      </Canvas>
    </div>
  )
}
