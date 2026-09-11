import { color } from '@/app/design/tokens'
import { cn } from '@/app/ui/cn'

/**
 * Compact SVG bar chart for weekly / daily activity buckets.
 * data: [{ label, value }]  — value is any number, height is scaled to max.
 * Renders as a viewBox so the chart scales with its container.
 */
export function BarChart({ data, height = 96, className, ariaLabel = 'Bar chart' }) {
  const max = Math.max(1, ...data.map((d) => d.value))
  const barW = 100 / data.length
  const gap = barW * 0.24
  const inner = barW - gap

  return (
    <svg
      viewBox={`0 0 100 ${height}`}
      preserveAspectRatio="none"
      className={cn('block w-full', className)}
      role="img"
      aria-label={ariaLabel}
      style={{ height }}
    >
      {data.map((d, i) => {
        const h = (d.value / max) * (height - 18)
        const x = i * barW + gap / 2
        const y = height - h - 14
        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={inner}
              height={h}
              rx={1.5}
              fill={d.value > 0 ? color.accent : color.border}
              opacity={d.value > 0 ? 0.85 : 0.5}
            />
            <text
              x={x + inner / 2}
              y={height - 2}
              textAnchor="middle"
              fontSize="7"
              fill={color.fgDim}
              fontFamily={"'Intel One Mono', ui-monospace, monospace"}
            >
              {d.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
