import { RoundedBox } from '@react-three/drei'

// A dark chassis and a recessed face share one transform and one light rig.
export function Slab({ size = [1.8, 2.7, 0.105], children, color = '#26303d' }) {
  const [w, h, d] = size
  return (
    <group>
      <RoundedBox
        args={size}
        radius={Math.min(0.045, d * 0.38)}
        smoothness={3}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color={color} metalness={0.06} roughness={0.86} />
      </RoundedBox>
      <RoundedBox
        args={[w - 0.024, h - 0.024, 0.018]}
        position={[0, 0, d / 2 - 0.007]}
        radius={0.008}
        smoothness={2}
        receiveShadow
      >
        <meshStandardMaterial color="#2c3848" metalness={0.1} roughness={0.84} />
      </RoundedBox>
      {children}
    </group>
  )
}

export function Face({ texture, width = 1.74, height = 2.64, z = 0.058, materialRef }) {
  return (
    <mesh position={[0, 0, z]} receiveShadow>
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial
        ref={materialRef}
        map={texture}
        emissiveMap={texture}
        emissive="#ffffff"
        emissiveIntensity={0.48}
        color="#e1e6ef"
        roughness={texture?.image?.tagName === 'IMG' ? 0.58 : 0.82}
        metalness={0.02}
        transparent
        alphaTest={0.015}
      />
    </mesh>
  )
}
