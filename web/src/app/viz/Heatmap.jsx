import { memo } from 'react'
import { color } from '@/app/design/tokens'
import { cn } from '@/app/ui/cn'

/**
 * 7×24 heatmap grid: rows are weekdays (Sun–Sat, matching Date.getDay()),
 * columns are hours 0–23 in the user's local timezone. Cell intensity is
 * hours/day-hour scaled against the matrix max — empty cells stay visible
 * so the grid reads as a schedule, not a scatter plot.
 *
 * matrix: number[7][24]
 * rowLabels: string[7]  (short weekday names)
 */
function HeatmapImpl({ matrix, rowLabels, ariaLabel = 'Activity by day and hour', className }) {
  const max = matrix.reduce((m, row) => Math.max(m, ...row), 0)

  return (
    <div className={cn('w-full', className)} role="img" aria-label={ariaLabel}>
      <div className="flex items-stretch gap-1">
        <div className="flex w-6 shrink-0 flex-col justify-between py-[1px] text-right">
          {rowLabels.map((lbl, r) => (
            <div
              key={r}
              className="text-[10px] leading-none text-[var(--app-fg-dim)]"
              style={{ fontFamily: "'Intel One Mono', ui-monospace, monospace" }}
            >
              {lbl}
            </div>
          ))}
        </div>
        <div className="flex flex-1 flex-col gap-[3px]">
          {matrix.map((row, r) => (
            <div key={r} className="flex flex-1 gap-[3px]">
              {row.map((v, h) => {
                const intensity = max > 0 ? v / max : 0
                const bg =
                  intensity === 0 ? color.bg3 : `rgba(76, 125, 255, ${0.15 + intensity * 0.75})`
                return (
                  <div
                    key={h}
                    className="aspect-square flex-1 rounded-[3px]"
                    style={{ background: bg }}
                    title={`${rowLabels[r]} ${h}:00 — ${v.toFixed(1)}h`}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-2 flex gap-1 pl-7 text-[10px] text-[var(--app-fg-dim)]">
        {Array.from({ length: 24 }, (_, i) => (
          <div
            key={i}
            className="flex-1 text-center"
            style={{ fontFamily: "'Intel One Mono', ui-monospace, monospace" }}
          >
            {i % 3 === 0 ? i : ''}
          </div>
        ))}
      </div>
    </div>
  )
}

// 168 inline style objects per render — memo bails out when matrix reference
// is stable (which it is thanks to the useMemo boundary in Stats).
export const Heatmap = memo(HeatmapImpl)
