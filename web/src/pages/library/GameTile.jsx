import { memo } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/app/ui/cn'
import { Art } from '@/app/ui/Art'
import { formatHours } from '@/lib/format'
import { gameKey } from './gameKey'

/**
 * Library tile — the same anatomy as Overview's Continue tile (UX v2 R2/R10):
 * a ≥180px 3:4 cover is the largest object, the whole tile is the target
 * (2px lift + art "breathe" via .app-tile), then a 16px title and one
 * readable metric. Without art, Art shows the game's identity colour.
 */
function GameTileImpl({ game, className, showMetric = true }) {
  const name = game.game || game.name || 'Untitled'
  return (
    <Link
      to={`/library/${gameKey(game)}`}
      className={cn('app-tile flex flex-col gap-3 rounded-[var(--app-r-3)]', className)}
    >
      <Art
        game={game}
        name={name}
        portrait
        className="app-frame aspect-[3/4] rounded-[var(--app-r-3)]"
      />
      <span className="flex min-w-0 flex-col gap-1">
        <span className="line-clamp-2 text-[16px] font-semibold leading-[1.3] text-[var(--app-fg-strong)]">
          {name}
        </span>
        {showMetric && game.total_hours != null && (
          <span className="app-wt-small text-[14px] text-[var(--app-fg-muted)]">
            <span className="app-num">{formatHours(game.total_hours)} h</span> played
            {/* Launcher-imported hours are labelled so the source is never a mystery. */}
            {!game.tracked_hours && game.imported_from?.length > 0 && (
              <> · from {game.imported_from.join(', ')}</>
            )}
          </span>
        )}
      </span>
    </Link>
  )
}

export const GameTile = memo(GameTileImpl)
