import { memo } from 'react'
import { cn } from '@/app/ui/cn'
import { Art, ArtChip, ArtScrim } from '@/app/ui/Art'

/**
 * Recommendation card (UX v2 §5.7), two variants:
 *
 *  - featured: landscape key art with the "why" on a left scrim — the same
 *              composition as Overview's Next up banner. Top picks only.
 *  - compact:  3:4 cover tile with the same anatomy as Library tiles.
 *
 * The critic score is a neutral "MC 85" chip: brand §2.3/2.4 reserve amber
 * for Drifting and red for errors, so scores are never colour-coded.
 */
function RecCardImpl({ game, reason, variant = 'compact', className }) {
  const genres = (game.genres || []).slice(0, 3)
  const name = game.name || 'Untitled'

  if (variant === 'featured') {
    return (
      <article aria-label={name} className={cn('app-tile min-w-0', className)}>
        <Art
          game={game}
          name={name}
          initial={false}
          position="50% 40%"
          className="app-frame flex min-h-[320px] items-end rounded-[var(--app-r-art)]"
        >
          <ArtScrim direction="left" />
          <div className="relative flex max-w-[560px] flex-col gap-3 p-6 text-[#F5F7F8] sm:p-8">
            <div className="flex flex-wrap items-center gap-2">
              {game.metacritic != null && <ArtChip>MC {game.metacritic}</ArtChip>}
              {genres.length > 0 && <ArtChip>{genres.join(' · ')}</ArtChip>}
            </div>
            <h3 className="text-[28px] font-semibold leading-[1.1] tracking-[-0.025em] sm:text-[34px]">
              {name}
            </h3>
            {reason && <p className="text-[16px] leading-[1.55] text-[#F5F7F8]/90">{reason}</p>}
          </div>
        </Art>
      </article>
    )
  }

  return (
    <article aria-label={name} className={cn('app-tile flex flex-col gap-3', className)}>
      <Art
        game={game}
        name={name}
        portrait
        className="app-frame aspect-[3/4] rounded-[var(--app-r-3)]"
      >
        {game.metacritic != null && (
          <span className="absolute left-2.5 top-2.5">
            <ArtChip className="h-7 px-2.5">MC {game.metacritic}</ArtChip>
          </span>
        )}
      </Art>
      <span className="flex min-w-0 flex-col gap-1">
        <span className="line-clamp-2 text-[16px] font-semibold leading-[1.3] text-[var(--app-fg-strong)]">
          {name}
        </span>
        {genres.length > 0 && (
          <span className="app-wt-small truncate text-[14px] text-[var(--app-fg-muted)]">
            {genres.join(' · ')}
          </span>
        )}
      </span>
    </article>
  )
}

export const RecCard = memo(RecCardImpl)
