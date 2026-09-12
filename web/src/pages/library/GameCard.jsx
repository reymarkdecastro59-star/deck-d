import { memo } from 'react'
import { Link } from 'react-router-dom'
import { Gamepad2 } from 'lucide-react'
import { cn } from '@/app/ui/cn'
import { coverBackgroundStyle } from '@/app/ui/safeUrl'
import { formatHours } from '@/lib/format'
import { gameKey } from './gameKey'

function GameCardImpl({ game, className }) {
  const key = gameKey(game)
  const coverStyle = coverBackgroundStyle(game.background_image)
  return (
    <Link
      to={`/library/${key}`}
      className={cn(
        'group relative flex flex-col overflow-hidden',
        'rounded-[var(--app-r-3)] border border-[var(--app-border)] bg-[var(--app-bg-2)]',
        'transition-colors [transition-duration:var(--app-dur-2)] [transition-timing-function:var(--app-ease-out)]',
        'hover:border-[var(--app-border-strong)] hover:bg-[var(--app-bg-3)]',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-accent)]',
        className
      )}
    >
      <div
        aria-hidden
        className="relative aspect-[16/9] overflow-hidden bg-[var(--app-bg-3)]"
        style={coverStyle}
      >
        {!coverStyle && (
          <div className="absolute inset-0 flex items-center justify-center text-[var(--app-fg-dim)]">
            <Gamepad2 className="h-6 w-6" strokeWidth={1.5} />
          </div>
        )}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(180deg, rgba(6,7,14,0) 40%, rgba(6,7,14,0.75) 100%)',
          }}
        />
      </div>
      <div className="p-4">
        <div className="truncate text-[14px] font-medium text-[var(--app-fg)]">{game.game}</div>
        <div className="app-num mt-2 flex items-baseline gap-3">
          <span className="text-[13px] text-[var(--app-fg-strong)]">
            {formatHours(game.total_hours)}
            <span className="text-[11px] text-[var(--app-fg-muted)]"> h</span>
          </span>
          <span className="text-[11px] text-[var(--app-fg-dim)]">
            {formatHours(game.decay_hours)}h momentum
          </span>
        </div>
      </div>
    </Link>
  )
}

export const GameCard = memo(GameCardImpl)
