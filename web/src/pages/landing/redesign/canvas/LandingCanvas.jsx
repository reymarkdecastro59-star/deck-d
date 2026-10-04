import { Component, Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import SceneController from './SceneController'
import PrevisWorld from './PrevisWorld'
class CanvasBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? (
      <div className="deck-canvas-fallback">Your games. One connected library.</div>
    ) : (
      this.props.children
    )
  }
}
export default function LandingCanvas({ previs = false }) {
  return (
    <div aria-hidden="true" className="deck-canvas">
      <CanvasBoundary>
        <Canvas
          frameloop="demand"
          shadows
          dpr={[1, 1.5]}
          camera={{ position: [0, 0.1, 10], fov: 40, near: 0.1, far: 200 }}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
          fallback={<div className="deck-canvas-fallback">Your games. One connected library.</div>}
        >
          <fog attach="fog" args={['#0b1420', 30, 78]} />
          <hemisphereLight
            args={previs ? ['#ffffff', '#666666', 1.2] : ['#afbed2', '#171c25', 0.55]}
          />
          <directionalLight
            position={[-4, 12, 8]}
            intensity={previs ? 2 : 2.5}
            color={previs ? '#ffffff' : '#d5e3fc'}
            castShadow
            shadow-mapSize={[2048, 2048]}
            shadow-camera-left={-12}
            shadow-camera-right={12}
            shadow-camera-top={10}
            shadow-camera-bottom={-8}
            shadow-normalBias={0.025}
            shadow-bias={-0.0001}
            shadow-intensity={0.3}
            shadow-radius={3}
          />
          {!previs && (
            <>
              <directionalLight position={[9, 6, -16]} intensity={1.25} color="#91a6c2" />
              <pointLight position={[2, 2, 5]} intensity={5} color="#bfd5f5" distance={18} />
              <directionalLight position={[-7, 1, -4]} intensity={0.5} color="#7b91ad" />
            </>
          )}
          <SceneController previs />
          <Suspense fallback={null}>
            <PrevisWorld polished={!previs} />
          </Suspense>
        </Canvas>
      </CanvasBoundary>
    </div>
  )
}
