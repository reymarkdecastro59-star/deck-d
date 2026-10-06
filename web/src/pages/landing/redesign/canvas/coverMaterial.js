import * as THREE from 'three'

const vertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fragmentShader = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec4 uCrop;
  uniform float uOpacity;
  uniform float uEdgeFeather;

  varying vec2 vUv;

  void main() {
    vec2 uv = uCrop.xy + vUv * uCrop.zw;
    vec4 sampled = texture2D(uMap, uv);
    float edgeDistance = min(min(vUv.x, vUv.y), min(1.0 - vUv.x, 1.0 - vUv.y));
    float edgeAlpha = smoothstep(0.0, uEdgeFeather, edgeDistance);

    gl_FragColor = vec4(sampled.rgb, sampled.a * edgeAlpha * uOpacity);
  }
`

export function createCoverMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: null },
      uCrop: { value: new THREE.Vector4(0, 0, 1, 1) },
      uOpacity: { value: 1 },
      uEdgeFeather: { value: 0.008 },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  })
}

export function disposeCoverMaterial(material) {
  if (!material) return

  material.uniforms.uMap.value?.dispose()
  material.dispose()
}
