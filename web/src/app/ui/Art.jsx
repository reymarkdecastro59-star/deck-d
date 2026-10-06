import { useState } from 'react'
import { cn } from './cn'
import { safeImageUrl } from './safeUrl'
import { gameColor } from '@/lib/gameColor'

/**
 * Game artwork layer. RAWG `background_image` is landscape key art, so
 * hero/banner contexts use it as-is and collections crop it to 3:4 with
 * the subject kept upper-centre (50% 30%). Only https URLs are allowed
 * (see safeUrl). Without art, a tonal block in the game's identity colour
 * with its initial stands in — never an empty grey box.
 */
export function Art({
  game,
  name,
  className,
  position = '50% 30%',
  initial = true,
  portrait = false,
  children,
}) {
  // 3:4 tiles prefer a true portrait cover (Steam's library_600x900) when the
  // game has one; if it 404s (some older games), fall back to the key art.
  // Remember which URL failed (not a boolean) so a reused tile showing a
  // different game still tries that game's cover.
  const [failedCover, setFailedCover] = useState(null)
  const coverUrl = portrait ? safeImageUrl(game?.cover_image) : null
  const cover = coverUrl && coverUrl !== failedCover ? coverUrl : null
  const url = cover || safeImageUrl(game?.background_image)
  const label = name || game?.game || game?.game_name || 'Game'
  return (
    <div
      className={cn('relative overflow-hidden bg-[var(--app-bg-3)]', className)}
      style={url ? undefined : { background: gameColor(game ?? label) }}
    >
      {url ? (
        <img
          src={url}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
          className="app-art absolute inset-0 h-full w-full select-none object-cover"
          style={{ objectPosition: cover ? '50% 50%' : position }}
          onError={cover ? () => setFailedCover(cover) : undefined}
        />
      ) : (
        initial && (
          <span
            aria-hidden
            className="absolute inset-0 flex items-center justify-center text-[clamp(18px,30%,56px)] font-semibold text-white/80"
          >
            {(label.trim().charAt(0) || '?').toUpperCase()}
          </span>
        )
      )}
      {children}
    </div>
  )
}

/** Readable text over art: dark scrim, the one permitted gradient. */
export function ArtScrim({ direction = 'bottom', strength = 0.8, className }) {
  const g =
    direction === 'left'
      ? `linear-gradient(90deg, rgba(8,10,12,${strength + 0.08}) 0%, rgba(8,10,12,${strength - 0.2}) 40%, rgba(8,10,12,0) 78%), linear-gradient(0deg, rgba(8,10,12,${strength - 0.1}) 0%, rgba(8,10,12,0) 45%)`
      : `linear-gradient(0deg, rgba(8,10,12,${strength}) 0%, rgba(8,10,12,${strength * 0.5}) 40%, rgba(8,10,12,0) 72%)`
  return (
    <div
      aria-hidden
      className={cn('pointer-events-none absolute inset-0', className)}
      style={{ background: g }}
    />
  )
}

/** Small pill that sits on top of art (fixed light-on-dark in both themes). */
export function ArtChip({ children, className }) {
  return (
    <span
      className={cn(
        'inline-flex h-[30px] items-center gap-2 rounded-full border border-white/15 bg-[rgba(8,10,12,0.55)] px-3 text-[13px] font-medium text-[#F5F7F8]',
        className
      )}
    >
      {children}
    </span>
  )
}
