import { useState } from 'react'
import { useMotionValueEvent } from 'motion/react'
import { useMasterTimeline } from '../hooks/useMasterTimeline'
import { PREVIS_SHOTS, previsShot } from './previsShots'
import './previs.css'

export default function PrevisOverlay({ onSeek, reduced, onReduced }) {
  const { sceneProgress } = useMasterTimeline()
  const [progress, setProgress] = useState(sceneProgress.get())
  const [guides, setGuides] = useState(false)
  useMotionValueEvent(sceneProgress, 'change', setProgress)
  const shot = previsShot(progress)
  return (
    <>
      <div className={`previs-copy ${progress >= 0.94 ? 'previs-copy--closing' : ''}`}>
        <p>DECK’D / COMPOSITION STUDY</p>
        <h1>{shot.copy}</h1>
        <small>Graybox · Illustrative product states</small>
      </div>
      {guides && (
        <div className="previs-guides" aria-hidden="true">
          <span>COPY SAFE ZONE</span>
        </div>
      )}
      <aside className="previs-controls" aria-label="Previs storyboard controls">
        <label>
          Story frame
          <select
            value={shot.id}
            onChange={(e) => onSeek(PREVIS_SHOTS.find((s) => s.id === e.target.value).p)}
          >
            {PREVIS_SHOTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          Master scroll{' '}
          <input
            aria-label="Master scroll"
            type="range"
            min="0"
            max="1000"
            value={Math.round(progress * 1000)}
            onChange={(e) => onSeek(Number(e.target.value) / 1000)}
          />
        </label>
        <output>{(progress * 100).toFixed(1)}%</output>
        <label>
          <input type="checkbox" checked={guides} onChange={(e) => setGuides(e.target.checked)} />{' '}
          Thirds
        </label>
        <label>
          <input type="checkbox" checked={reduced} onChange={(e) => onReduced(e.target.checked)} />{' '}
          Reduced motion
        </label>
      </aside>
    </>
  )
}
