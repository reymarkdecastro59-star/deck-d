import { cn } from '@/app/ui/cn'
import { gameColor } from '@/lib/gameColor'

const pad = (n) => String(n).padStart(2, '0')
const clock = (h) => `${pad(Math.floor(h))}:${pad(Math.round((h % 1) * 60) % 60)}`

/**
 * This week as a picture: one 24-hour rail per day, sessions drawn as blocks
 * in each game's identity colour. Decorative summary (role="img" with a text
 * alternative); the session list next to it is the accessible source of truth.
 * `live` = { day, start, game } draws the in-progress session as a hatched,
 * outlined block that grows to "now".
 */
export function WeekTimeline({ days, gamesByName, live, compact = false, className }) {
  const nowH = new Date().getHours() + new Date().getMinutes() / 60
  const summary = days
    .filter((d) => d.spans.length)
    .map(
      (d) =>
        `${d.label}: ${d.spans.map((s) => `${s.game} ${clock(s.start)} to ${clock(s.end)}`).join(', ')}`
    )
    .join('. ')

  return (
    <div
      role="img"
      aria-label={summary ? `Sessions this week. ${summary}.` : 'No sessions this week yet.'}
      className={cn('flex flex-col gap-2', className)}
    >
      {days.map((d) => (
        <div key={d.label} className="flex items-center gap-3">
          <span
            className={cn(
              'shrink-0 text-[13px]',
              compact ? 'w-9' : 'w-11',
              d.isToday
                ? 'font-semibold text-[var(--app-fg)]'
                : 'app-wt-small text-[var(--app-fg-muted)]'
            )}
          >
            {d.label}
          </span>
          <div
            className={cn(
              'relative flex-1 rounded-[5px] bg-[var(--app-bg-3)]',
              compact ? 'h-[22px]' : 'h-[26px]',
              d.isFuture && 'opacity-50'
            )}
          >
            {[6, 12, 18].map((h) => (
              <span
                key={h}
                aria-hidden
                className="absolute inset-y-0 w-px bg-[var(--app-hairline)]"
                style={{ left: `${(h / 24) * 100}%` }}
              />
            ))}
            {d.spans.map((s, i) => (
              <span
                key={s.sessionId ?? i}
                title={`${s.game}, ${clock(s.start)}–${clock(s.end)}`}
                className="absolute inset-y-[3px] rounded-[3px]"
                style={{
                  left: `${(s.start / 24) * 100}%`,
                  width: `max(3px, ${((s.end - s.start) / 24) * 100}%)`,
                  background: gameColor(gamesByName?.get(s.game) ?? s.game),
                }}
              />
            ))}
            {live && d.isToday && (
              <span
                title={`${live.game}, playing now`}
                className="absolute inset-y-[3px] rounded-[3px] outline outline-1 outline-[var(--app-accent)]"
                style={{
                  left: `${(live.start / 24) * 100}%`,
                  width: `max(4px, ${((Math.max(nowH, live.start) - live.start) / 24) * 100}%)`,
                  background: `repeating-linear-gradient(135deg, ${gameColor(
                    gamesByName?.get(live.game) ?? live.game
                  )} 0 6px, transparent 6px 9px)`,
                }}
              />
            )}
          </div>
        </div>
      ))}
      <div aria-hidden className="flex items-center gap-3">
        <span className={cn('shrink-0', compact ? 'w-9' : 'w-11')} />
        <div className="app-num flex flex-1 justify-between text-[12px] text-[var(--app-fg-dim)]">
          {['00', '06', '12', '18', '24'].map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
      </div>
    </div>
  )
}
