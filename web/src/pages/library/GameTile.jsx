import { memo } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/app/ui/cn'
import { coverBackgroundStyle } from '@/app/ui/safeUrl'
import { formatHours } from '@/lib/format'
import { gameKey } from './gameKey'
import { CoverFallback } from './CoverFallback'

/**
 * Cover-first tile for the Library grid and dashboard rails. Deliberately
 * chrome-less: no border, no filled card. The cover artwork carries the
 * visual weight; a tight two-line title + a single quiet metric sit under
 * it. On pointer hover we tint the cover down slightly so the eye reads
 * "target" without any glow or scale animation.
 *
 * Density is controlled by the parent grid — this component only handles
 * one game's anatomy.
 */
function GameTileImpl({ game, className, showMetric = true }) {
  const cover = coverBackgroundStyle(game.background_image)
  const name = game.game || game.name || 'Untitled'
  const key = gameKey(game)
  return (
    <Link
      to={`/library/${key}`}
      title={name}
      className={cn(
        'group block rounded-[var(--app-r-2)]',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--app-accent)]',
        className
      )}
    >
      <div
        aria-hidden
        className="relative aspect-[3/4] overflow-hidden rounded-[var(--app-r-2)] bg-[var(--app-bg-3)]"
        style={cover}
      >
        {!cover && <CoverFallback name={name} />}
        {/* Quiet pointer-hover tint. No scale, no glow — just enough to
            signal the whole tile is a target. */}
        <div className="absolute inset-0 bg-[var(--app-bg)] opacity-0 transition-opacity [transition-duration:var(--app-dur-2)] group-hover:opacity-[0.12]" />
      </div>
      <div className="mt-2.5">
        <div className="line-clamp-2 min-h-[34px] text-[13px] leading-[1.35] text-[var(--app-fg)]">
          {name}
        </div>
        {showMetric && game.total_hours != null && (
          <div className="app-num mt-1 text-[11px] text-[var(--app-fg-dim)]">
            {formatHours(game.total_hours)} h · {formatHours(game.decay_hours ?? 0)} h momentum
          </div>
        )}
      </div>
    </Link>
  )
}

export const GameTile = memo(GameTileImpl)
