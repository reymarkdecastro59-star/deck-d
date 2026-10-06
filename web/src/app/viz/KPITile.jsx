import { cn } from '@/app/ui/cn'

/**
 * KPI tile — icon + label on top row, big monospace value below, footnote
 * at the bottom. Deliberately calm: no gradient, no animated counter. The
 * number IS the point. Empty values render as an em-dash rather than 0.
 *
 * Props:
 *   icon      — <IconComponent /> node, optional
 *   label     — required
 *   value     — string | number | null (null renders as em-dash)
 *   unit      — small trailing unit ("h", etc.)
 *   footnote  — quiet caption below the value
 *   tone      — 'default' | 'ok' | 'warn'
 */
export function KPITile({ icon, label, value, unit, footnote, tone = 'default', className }) {
  const toneBorder = {
    default: 'border-[var(--app-border)]',
    ok: 'border-[color:var(--app-ok)]/20',
    warn: 'border-[color:var(--app-warn)]/20',
  }[tone]

  const hasValue = value != null && value !== ''

  return (
    <div
      className={cn(
        'flex flex-col rounded-[var(--app-r-3)] border bg-[var(--app-bg-2)] p-5',
        toneBorder,
        className
      )}
    >
      <div className="flex items-center gap-3">
        {icon && (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--app-r-2)] bg-[var(--app-bg-3)] text-[var(--app-fg-muted)]">
            {icon}
          </span>
        )}
        <div className="app-eyebrow text-[10.5px] text-[var(--app-fg-muted)]">{label}</div>
      </div>

      <div className="mt-4 flex items-baseline gap-1.5">
        <span
          className={cn(
            'app-num leading-none tracking-tight',
            hasValue ? 'text-[var(--app-fg-strong)]' : 'text-[var(--app-fg-dim)]'
          )}
          style={{ fontSize: 'clamp(30px, 2.6vw, 36px)' }}
        >
          {hasValue ? value : '—'}
        </span>
        {hasValue && unit && <span className="text-[13px] text-[var(--app-fg-muted)]">{unit}</span>}
      </div>

      {footnote && (
        <div className="mt-3 text-[12px] leading-relaxed text-[var(--app-fg-dim)]">{footnote}</div>
      )}
    </div>
  )
}
