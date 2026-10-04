import { memo } from 'react'
import { Star } from 'lucide-react'
import { cn } from '@/app/ui/cn'
import { coverBackgroundStyle } from '@/app/ui/safeUrl'
import { CoverFallback } from '@/pages/library/CoverFallback'

function metacriticTone(score) {
  if (score == null) return 'muted'
  if (score >= 85) return 'ok'
  if (score >= 75) return 'accent'
  if (score >= 60) return 'warn'
  return 'danger'
}

const TONE = {
  ok: 'text-[var(--app-ok)]',
  accent: 'text-[var(--app-accent-hi)]',
  warn: 'text-[var(--app-warn)]',
  danger: 'text-[var(--app-danger)]',
  muted: 'text-[var(--app-fg-muted)]',
}

/**
 * Recommendation card in two variants:
 *
 *  - compact:  portrait cover-first tile (matches Library GameTile).
 *              Metacritic pill floats on the cover in the corner.
 *
 *  - featured: horizontal editorial layout with a wide cover on the left
 *              and the LLM "reason" as pull-quote text on the right. Used
 *              for the top-picks tier only, where each card gets breathing
 *              room instead of being packed into a grid.
 *
 * Neither variant uses a bordered container — surrounding whitespace and
 * typographic hierarchy carry the grouping. Genre chips are capped to 3
 * so a game with 10 genres doesn't destroy the composition.
 */
function RecCardImpl({ game, reason, variant = 'compact', className }) {
  const genres = (game.genres || []).slice(0, 3)
  const tone = metacriticTone(game.metacritic)
  const cover = coverBackgroundStyle(game.background_image)
  const name = game.name || 'Untitled'

  if (variant === 'featured') {
    return (
      <article
        title={name}
        className={cn(
          'group grid grid-cols-1 gap-4 sm:grid-cols-[minmax(160px,200px)_1fr] sm:gap-6',
          className
        )}
      >
        <div
          aria-hidden
          className="relative aspect-[3/4] overflow-hidden rounded-[var(--app-r-2)] bg-[var(--app-bg-3)]"
          style={cover}
        >
          {!cover && <CoverFallback name={name} />}
          <div className="absolute inset-0 bg-[var(--app-bg)] opacity-0 transition-opacity [transition-duration:var(--app-dur-2)] group-hover:opacity-[0.10]" />
        </div>
        <div className="min-w-0 self-center">
          <div className="flex items-center gap-2">
            {game.metacritic != null && (
              <span
                className={cn('app-num inline-flex items-center gap-1 text-[12px]', TONE[tone])}
              >
                <Star className="h-3 w-3" strokeWidth={2} />
                {game.metacritic}
              </span>
            )}
            {genres.length > 0 && (
              <span className="truncate text-[12px] text-[var(--app-fg-dim)]">
                {genres.join(' · ')}
              </span>
            )}
          </div>
          <h3
            className="mt-2 font-normal leading-[1.15] tracking-tight text-[var(--app-fg-strong)]"
            style={{ fontSize: 'clamp(18px, 1.6vw, 22px)' }}
          >
            {name}
          </h3>
          {reason && (
            <p className="mt-3 border-l-2 border-[var(--app-accent-rail)] pl-3 text-[13.5px] leading-relaxed text-[var(--app-fg-muted)]">
              {reason}
            </p>
          )}
        </div>
      </article>
    )
  }

  return (
    <article title={name} className={cn('group block', className)}>
      <div
        aria-hidden
        className="relative aspect-[3/4] overflow-hidden rounded-[var(--app-r-2)] bg-[var(--app-bg-3)]"
        style={cover}
      >
        {!cover && <CoverFallback name={name} />}
        <div className="absolute inset-0 bg-[var(--app-bg)] opacity-0 transition-opacity [transition-duration:var(--app-dur-2)] group-hover:opacity-[0.12]" />
        {game.metacritic != null && (
          <span
            className={cn(
              'app-num absolute right-2 top-2 inline-flex items-center gap-1 rounded-full',
              'border border-[var(--app-border-strong)] bg-[var(--app-bg-raised)] px-2 py-0.5 text-[11px]',
              TONE[tone]
            )}
          >
            <Star className="h-3 w-3" strokeWidth={2} />
            {game.metacritic}
          </span>
        )}
      </div>
      <div className="mt-2.5">
        <div className="line-clamp-2 min-h-[34px] text-[13px] leading-[1.35] text-[var(--app-fg)]">
          {name}
        </div>
        {genres.length > 0 && (
          <div className="mt-1 truncate text-[11px] text-[var(--app-fg-dim)]">
            {genres.join(' · ')}
          </div>
        )}
      </div>
    </article>
  )
}

export const RecCard = memo(RecCardImpl)
