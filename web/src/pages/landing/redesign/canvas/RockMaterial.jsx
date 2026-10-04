import { Component, Suspense, useEffect, useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import { RepeatWrapping, SRGBColorSpace, NoColorSpace, ShaderChunk } from 'three'
import albedoUrl from '../../../../assets/landing/terrain/rock_albedo.webp'
import normalUrl from '../../../../assets/landing/terrain/rock_normal.webp'
import roughnessUrl from '../../../../assets/landing/terrain/rock_roughness.webp'
import heightUrl from '../../../../assets/landing/terrain/rock_height.webp'

const urls = [albedoUrl, normalUrl, roughnessUrl, heightUrl]
useTexture.preload(urls)

class MaterialBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error) {
    if (import.meta.env.DEV) console.warn('Rock maps unavailable; using procedural stone.', error)
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

function PBRStone({ detail }) {
  const sources = useTexture(urls)
  const gl = useThree((s) => s.gl)
  const maps = useMemo(
    () =>
      sources.map((source, i) => {
        const map = source.clone()
        map.colorSpace = i === 0 ? SRGBColorSpace : NoColorSpace
        map.wrapS = map.wrapT = RepeatWrapping
        map.repeat.set(7, 6.4)
        map.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy())
        map.needsUpdate = true
        return map
      }),
    [sources, gl]
  )
  useEffect(() => () => maps.forEach((map) => map.dispose()), [maps])
  const shader = useMemo(
    () => (program) => {
      program.uniforms.rockDetail = { value: detail }
      program.vertexShader = program.vertexShader
        .replace(
          '#include <common>',
          '#include <common>\nvarying vec2 rockUV; varying float rockSlope;'
        )
        .replace('#include <uv_vertex>', '#include <uv_vertex>\nrockUV = uv; rockSlope = normal.z;')
      program.fragmentShader = program.fragmentShader
        .replace(
          '#include <common>',
          '#include <common>\nuniform sampler2D rockDetail; varying vec2 rockUV; varying float rockSlope;'
        )
        .replace(
          '#include <roughnessmap_fragment>',
          `
        #include <roughnessmap_fragment>
        // Broad damp shelves and dry slopes share the same stone hue.
        float shelf = smoothstep(0.75, 0.98, rockSlope);
        float dampMask = texture2D(roughnessMap, rockUV * 1.7).r;
        roughnessFactor = mix(0.94, 0.7, shelf * smoothstep(0.3, 0.8, dampMask));`
        )
        .replace('#include <normal_fragment_maps>', ShaderChunk.normal_fragment_maps)
        .replace(
          'mapN.xy *= normalScale;',
          `
        // Unique full-landscape fractures break up the repeated scanned surface.
        vec3 fine = texture2D(rockDetail, rockUV).xyz * 2.0 - 1.0;
        mapN = normalize(vec3(mapN.xy + fine.xy * 0.24, mapN.z));
        float distanceDetail = 1.0 - smoothstep(12.0, 48.0, vViewPosition.z);
        mapN.xy *= normalScale * mix(0.24, 1.0, distanceDetail);`
        )
    },
    [detail]
  )
  return (
    <meshStandardMaterial
      color="#64717e"
      vertexColors
      map={maps[0]}
      normalMap={maps[1]}
      normalScale={[0.68, 0.68]}
      roughnessMap={maps[2]}
      roughness={0.9}
      displacementMap={maps[3]}
      displacementScale={0.12}
      displacementBias={-0.06}
      metalness={0.015}
      onBeforeCompile={shader}
      customProgramCacheKey={() => 'rock-macro-v2'}
    />
  )
}

export default function RockMaterial({ normal, roughness }) {
  const fallback = (
    <meshStandardMaterial
      color="#293440"
      vertexColors
      normalMap={normal}
      normalScale={[0.65, 0.65]}
      roughnessMap={roughness}
      roughness={0.92}
      metalness={0.01}
    />
  )
  return (
    <MaterialBoundary fallback={fallback}>
      <Suspense fallback={fallback}>
        <PBRStone detail={normal} />
      </Suspense>
    </MaterialBoundary>
  )
}
