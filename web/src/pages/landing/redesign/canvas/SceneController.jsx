import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useMasterTimeline } from '../hooks/useMasterTimeline'
import { sample } from '../hooks/timelinePhases'
import { CAMERA_JOURNEY } from './cameraJourney'
import { previsCamera } from './previsShots'
export default function SceneController({ previs = false }) {
  const frames = useRef(0)
  const { scrollProgress, sceneProgress, intro, reducedMotion } = useMasterTimeline()
  const invalidate = useThree((state) => state.invalidate)
  useEffect(() => scrollProgress.on('change', invalidate), [scrollProgress, invalidate])
  useEffect(() => sceneProgress.on('change', invalidate), [sceneProgress, invalidate])
  useEffect(() => intro.on('change', invalidate), [intro, invalidate])
  useEffect(() => invalidate(), [invalidate, reducedMotion])
  useFrame(({ camera, size, gl }) => {
    if (import.meta.env.DEV) {
      gl.domElement.dataset.sceneFrames = String(++frames.current)
      gl.domElement.dataset.drawCalls = String(gl.info.render.calls)
      gl.domElement.dataset.triangles = String(gl.info.render.triangles)
      gl.domElement.dataset.sceneProgress = String(sceneProgress.get())
    }
    if (previs) {
      const { v, fov } = previsCamera(sceneProgress.get(), size.width, size.height)
      camera.position.set(...v.slice(0, 3))
      camera.lookAt(...v.slice(3))
      if (camera.fov !== fov) {
        camera.fov = fov
        camera.updateProjectionMatrix()
      }
      camera.updateMatrixWorld()
      return
    }
    const v = sample(sceneProgress.get(), CAMERA_JOURNEY)
    // Reduced motion already snaps sceneProgress; retain the authored camera framing.
    const travel = size.width < 700 ? 0.25 : 1
    camera.position.set(v[0] * travel, 0.1 + (v[1] - 0.1) * travel, 10 + (v[2] - 10) * travel)
    camera.lookAt(v[3] * travel, v[4] * travel, v[5] * travel)
    camera.updateMatrixWorld()
  }, -2)
  return null
}
