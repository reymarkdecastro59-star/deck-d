import { useEffect, useMemo } from 'react'
import RockMaterial from './RockMaterial'
import {
  PlaneGeometry,
  DataTexture,
  RGBAFormat,
  LinearFilter,
  LinearMipmapLinearFilter,
  Float32BufferAttribute,
  Color,
} from 'three'

const fract = (n) => n - Math.floor(n)
function noise(x, y) {
  const a = Math.floor(x),
    b = Math.floor(y),
    u = x - a,
    v = y - b
  const s = u * u * (3 - 2 * u),
    t = v * v * (3 - 2 * v)
  const hash = (i, j) => fract(Math.sin(i * 127.1 + j * 311.7) * 43758.5453)
  return (
    (hash(a, b) * (1 - s) + hash(a + 1, b) * s) * (1 - t) +
    (hash(a, b + 1) * (1 - s) + hash(a + 1, b + 1) * s) * t
  )
}
function stone(x, y) {
  const warp = noise(x * 0.7, y * 0.7) * 1.8
  const ridge = 1 - Math.abs(noise(x * 2 + warp, y * 3.2) * 2 - 1)
  const fracture = Math.pow(1 - Math.abs(noise(x * 5.3, y * 3.7 + warp) * 2 - 1), 18)
  return (
    noise(x * 0.45, y * 0.45) * 0.5 +
    ridge * 0.23 +
    noise(x * 13, y * 13) * 0.055 -
    fracture * 0.12 +
    noise(x * 37, y * 37) * 0.025
  )
}
export default function RockTerrain() {
  const { geometry, normal, roughness } = useMemo(() => {
    const geometry = new PlaneGeometry(70, 64, 180, 160)
    const a = geometry.attributes.position
    const colors = new Float32Array(a.count * 3)
    const shade = new Color()
    for (let i = 0; i < a.count; i++) {
      const x = a.getX(i),
        y = a.getY(i)
      const shoulder = Math.pow(Math.min(1, Math.max(0, Math.abs(x) - 6) / 8), 2)
      const broad = Math.pow(1 - Math.abs(noise(x * 0.21, y * 0.19) * 2 - 1), 2)
      const peak = (cx, cy, sx, sy, height) =>
        height * Math.exp(-(((x - cx) / sx) ** 2) - ((y - cy) / sy) ** 2)
      // One connected landscape: split left ridge, central summit, stepped right flank.
      const mountain =
        peak(-13, 13, 6, 7, 4.5) +
        peak(-8, 20, 5, 6, 5.7) +
        peak(2, 24, 7, 6, 6.4) +
        peak(14, 18, 8, 7, 4.3)
      const erosion = 0.55 + Math.sqrt(broad) * 0.45
      const shelf = peak(8, 4, 9, 8, 0.6)
      const valley = peak(-4, 10, 3.5, 11, 0.7)
      const planes = Math.pow(noise(x * 0.085 + 9, y * 0.12), 2)
      const height =
        mountain * erosion +
        shelf -
        valley +
        shoulder * (broad * 1.5 + stone(x * 0.65, y * 0.65) * 0.5) +
        stone(x * 0.6, y * 0.6) * 0.15
      a.setZ(i, height)
      const value = 0.49 + planes * 0.28 + broad * 0.1 + Math.min(height / 8, 1) * 0.17
      shade.setRGB(value * 0.78, value * 0.86, value)
      colors.set([shade.r, shade.g, shade.b], i * 3)
    }
    geometry.setAttribute('color', new Float32BufferAttribute(colors, 3))
    geometry.computeVertexNormals()
    // Unique full-terrain maps: no repeated UV tiles or downloaded texture payload.
    const n = 768,
      heights = new Float32Array(n * n),
      normals = new Uint8Array(n * n * 4),
      rough = new Uint8Array(n * n * 4)
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) heights[y * n + x] = stone((x / n) * 36, (y / n) * 32)
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        const i = y * n + x,
          k = i * 4
        const dx =
          (heights[y * n + Math.min(n - 1, x + 1)] - heights[y * n + Math.max(0, x - 1)]) * 3.5
        const dy =
          (heights[Math.min(n - 1, y + 1) * n + x] - heights[Math.max(0, y - 1) * n + x]) * 3.5
        const len = Math.hypot(dx, dy, 1)
        normals.set([128 - (dx / len) * 127, 128 - (dy / len) * 127, 128 + 127 / len, 255], k)
        const wet = noise((x / n) * 17, (y / n) * 13)
        const value = Math.round(255 * (0.84 + 0.15 * wet))
        rough.set([value, value, value, 255], k)
      }
    const normal = new DataTexture(normals, n, n, RGBAFormat),
      roughness = new DataTexture(rough, n, n, RGBAFormat)
    for (const map of [normal, roughness]) {
      map.needsUpdate = true
      map.generateMipmaps = true
      map.minFilter = LinearMipmapLinearFilter
      map.magFilter = LinearFilter
      map.anisotropy = 4
    }
    return { geometry, normal, roughness }
  }, [])
  useEffect(
    () => () => {
      geometry.dispose()
      normal.dispose()
      roughness.dispose()
    },
    [geometry, normal, roughness]
  )
  return (
    <group>
      <mesh
        geometry={geometry}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -3.25, -5]}
        castShadow
        receiveShadow
      >
        <RockMaterial normal={normal} roughness={roughness} />
      </mesh>
      <mesh
        geometry={geometry}
        rotation={[-Math.PI / 2, 0, 0.13]}
        position={[9, -5.6, -34]}
        scale={[1.35, 0.8, 0.75]}
      >
        <meshStandardMaterial color="#273444" vertexColors roughness={1} metalness={0} />
      </mesh>
    </group>
  )
}
