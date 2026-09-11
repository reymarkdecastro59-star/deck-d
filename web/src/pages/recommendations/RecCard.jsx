import { Gamepad2, Star } from 'lucide-react'
import { cn } from '@/app/ui/cn'

function metacriticTone(score) {
  if (score == null) return 'muted'
  if (score >= 85) return 'ok'
  if (score >= 75) return 'accent'
  if (score >= 60) return 'warn'
  return 'danger'
}

const TONE_STYLES = {
  ok: 'text-[var(--app-ok)] border-[color:var(--app-ok)]/40 bg-[var(--app-ok-tint)]',
  accent:
    'text-[var(--app-accent-hi)] border-[color:var(--app-accent-rail)] bg-[var(--app-accent-tint)]',
  warn: 'text-[var(--app-warn)] border-[color:var(--app-warn)]/40 bg-[var(--app-warn-tint)]',
  danger:
    'text-[var(--app-danger)] border-[color:var(--app-danger)]/40 bg-[var(--app-danger-tint)]',
  muted: 'text-[var(--app-fg-muted)] border-[var(--app-border)] bg-[var(--app-bg-3)]',
}

/**
 * Recommendation card. Same shape works for all three tiers; the `reason` slot
 * is only used by top-picks (LLM). Genres are capped to 3 to avoid runaway
 * chip stacks when RAWG returns a long list.
 */
export function RecCard({ game, reason, variant = 'compact', className }) {
  const genres = (game.genres || []).slice(0, 3)
  const tone = metacriticTone(game.metacritic)

  return (
    <article
      className={cn(
        'flex flex-col overflow-hidden',
        'rounded-[var(--app-r-3)] border border-[var(--app-border)] bg-[var(--app-bg-2)]',
        'transition-colors [transition-duration:var(--app-dur-2)]',
        'hover:border-[var(--app-border-strong)]',
        className
      )}
    >
      <div
        aria-hidden
        className="relative aspect-[16/9] overflow-hidden bg-[var(--app-bg-3)]"
        style={
          game.background_image
            ? {
                backgroundImage: `url(${game.background_image})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }
            : undefined
        }
      >
        {!game.background_image && (
          <div className="absolute inset-0 flex items-center justify-center text-[var(--app-fg-dim)]">
            <Gamepad2 className="h-6 w-6" strokeWidth={1.5} />
          </div>
        )}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(180deg, rgba(6,7,14,0) 45%, rgba(6,7,14,0.75) 100%)',
          }}
        />
        {game.metacritic != null && (
          <span
            className={cn(
              'absolute right-3 top-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5',
              'app-num border text-[11px] backdrop-blur',
              TONE_STYLES[tone]
            )}
          >
            <Star className="h-3 w-3" strokeWidth={2} />
            {game.metacritic}
          </span>
        )}
      </div>
      <div className={cn('flex flex-col gap-2', variant === 'featured' ? 'p-5' : 'p-4')}>
        <div
          className={cn(
            'font-medium tracking-tight text-[var(--app-fg)]',
            variant === 'featured' ? 'text-[16px]' : 'text-[14px]'
          )}
        >
          {game.name}
        </div>
        {genres.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {genres.map((g) => (
              <span
                key={g}
                className="rounded border border-[var(--app-hairline)] bg-[var(--app-bg-3)] px-1.5 py-0.5 text-[11px] text-[var(--app-fg-muted)]"
              >
                {g}
              </span>
            ))}
          </div>
        )}
        {reason && (
          <p className="mt-1 border-l-2 border-[var(--app-accent-rail)] pl-3 text-[12.5px] leading-relaxed text-[var(--app-fg-muted)]">
            {reason}
          </p>
        )}
      </div>
    </article>
  )
}
