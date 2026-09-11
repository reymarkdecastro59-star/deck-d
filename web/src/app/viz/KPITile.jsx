import { cn } from '@/app/ui/cn'

/**
 * KPI tile — big number in Intel One Mono, label above, optional footnote below.
 * Deliberately calm: no gradient bg, no animated counter. The number IS the point.
 */
export function KPITile({ label, value, unit, footnote, accent, tone = 'default', className }) {
  const toneRing = {
    default: 'border-[var(--app-border)]',
    ok: 'border-[color:var(--app-ok)]/20',
    warn: 'border-[color:var(--app-warn)]/20',
  }[tone]

  return (
    <div
      className={cn(
        'rounded-[var(--app-r-3)] border bg-[var(--app-bg-2)] p-5',
        toneRing,
        className
      )}
    >
      <div className="app-eyebrow text-[11px] text-[var(--app-fg-muted)]">{label}</div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span
          className="app-num leading-none tracking-tight text-[var(--app-fg-strong)]"
          style={{ fontSize: 'clamp(28px, 2.4vw, 34px)' }}
        >
          {value}
        </span>
        {unit && <span className="text-[13px] text-[var(--app-fg-muted)]">{unit}</span>}
      </div>
      {accent && <div className="mt-1 text-[12px] text-[var(--app-fg-muted)]">{accent}</div>}
      {footnote && (
        <div className="mt-3 text-[12px] leading-relaxed text-[var(--app-fg-dim)]">{footnote}</div>
      )}
    </div>
  )
}
