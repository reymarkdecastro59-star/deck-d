import { memo } from 'react'
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
        <div className="flex w-9 shrink-0 flex-col gap-[3px] text-right">
          {rowLabels.map((lbl, r) => (
            <div
              key={r}
              className="app-num flex flex-1 items-center justify-end text-[12px] leading-none text-[var(--app-fg-dim)]"
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
                // Brand §2.5: one series, Signal. Intensity mixes Signal into
                // the empty-cell surface, so it works in both themes.
                const bg =
                  intensity === 0
                    ? 'var(--app-bg-3)'
                    : `color-mix(in srgb, var(--app-accent) ${Math.round(20 + intensity * 80)}%, var(--app-bg-3))`
                return (
                  <div
                    key={h}
                    className="min-h-[16px] flex-1 rounded-[3px]"
                    style={{ background: bg }}
                    title={`${rowLabels[r]} ${String(h).padStart(2, '0')}:00 — ${v.toFixed(1)} h`}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>
      <div aria-hidden className="mt-2 flex gap-[3px] pl-10 text-[12px] text-[var(--app-fg-dim)]">
        {Array.from({ length: 24 }, (_, i) => (
          <div key={i} className="app-num flex-1 text-center">
            {i % 6 === 0 ? `${String(i).padStart(2, '0')}:00` : ''}
          </div>
        ))}
      </div>
    </div>
  )
}

// 168 inline style objects per render — memo bails out when matrix reference
// is stable (which it is thanks to the useMemo boundary in Stats).
export const Heatmap = memo(HeatmapImpl)
