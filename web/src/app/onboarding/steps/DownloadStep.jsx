import { useMemo } from 'react'
import { Download, Info } from 'lucide-react'
import { Button } from '@/app/ui/Button'
import { SegmentedControl } from '@/app/ui/SegmentedControl'
import { OnboardingLayout } from '../OnboardingLayout'

const OS_OPTIONS = [
  { value: 'windows', label: 'Windows' },
  { value: 'macos', label: 'macOS' },
  { value: 'linux', label: 'Linux' },
]

function detectOS() {
  const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent
  if (/Mac/i.test(ua)) return 'macos'
  if (/Linux|X11/i.test(ua)) return 'linux'
  return 'windows'
}

const INSTRUCTIONS = {
  windows: [
    'Download and run the DECK’D tracker installer.',
    'Approve the Windows SmartScreen prompt (signed installer).',
    'The tracker appears in your system tray and starts recording immediately.',
  ],
  macos: [
    'Download the DECK’D tracker for macOS.',
    'Open the .dmg and drag DECK’D into Applications.',
    'On first launch, grant permission when prompted — the tracker lives in your menu bar.',
  ],
  linux: [
    'Download the tarball and extract it.',
    'Run ./install.sh from the extracted folder.',
    'The tracker runs as a background service and starts on next login.',
  ],
}

export function DownloadStep({ state, onChange, onNext, onBack, stepIdx, totalSteps }) {
  const detected = useMemo(() => detectOS(), [])
  const os = state.tracker.os ?? detected

  const setOs = (v) => onChange({ ...state, tracker: { ...state.tracker, os: v } })

  const acknowledge = (val) =>
    onChange({ ...state, tracker: { ...state.tracker, acknowledged: val } })

  const proceed = () => {
    if (!state.tracker.acknowledged) acknowledge(true)
    onNext()
  }

  return (
    <OnboardingLayout
      stepIdx={stepIdx}
      totalSteps={totalSteps}
      eyebrow="Step 3 of 4"
      title="Install the DECK'D tracker"
      lede="A tiny background app detects the games you play so your sessions land here automatically. It's optional — you can also record manually — but tracking is where DECK'D shines."
      footer={
        <>
          <Button variant="quiet" onClick={proceed}>
            I'll do this later
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={onBack}>
              Back
            </Button>
            <Button variant="primary" onClick={proceed}>
              Continue
            </Button>
          </div>
        </>
      }
    >
      <div className="space-y-6">
        <div>
          <p className="mb-3 text-[13px] font-medium text-[var(--app-fg)]">Your platform</p>
          <SegmentedControl items={OS_OPTIONS} value={os} onChange={setOs} />
        </div>

        <div className="overflow-hidden rounded-[var(--app-r-3)] border border-[var(--app-border)] bg-[var(--app-bg-2)]">
          <div className="flex items-start gap-4 border-b border-[var(--app-border)] p-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--app-r-2)] bg-[var(--app-accent-tint)] text-[var(--app-accent-hi)]">
              <Download className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-medium text-[var(--app-fg)]">DECK'D Tracker</p>
              <p className="mt-1 text-[13px] text-[var(--app-fg-muted)]">
                Runs quietly in the background. Detects games from Steam, Epic, GOG, Xbox, and
                standalone launchers.
              </p>
              <div className="mt-4 flex items-center gap-2">
                {/* TODO(backend): wire href to a signed release artifact once the tracker ships. */}
                <Button variant="primary" size="sm" leadingIcon={<Download className="h-4 w-4" />}>
                  Download for {OS_OPTIONS.find((o) => o.value === os)?.label}
                </Button>
                <span className="app-num text-[12px] text-[var(--app-fg-dim)]">v0.1 · ~14 MB</span>
              </div>
            </div>
          </div>

          <ol className="space-y-3 p-5">
            {INSTRUCTIONS[os].map((step, i) => (
              <li key={i} className="flex gap-3 text-[13.5px] text-[var(--app-fg)]">
                <span
                  aria-hidden
                  className="app-num flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[var(--app-border)] bg-[var(--app-bg-3)] text-[12px] text-[var(--app-fg-muted)]"
                >
                  {i + 1}
                </span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="flex items-start gap-3 rounded-[var(--app-r-2)] border border-[var(--app-border)] bg-[var(--app-bg-2)] p-4">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--app-fg-muted)]" strokeWidth={1.75} />
          <p className="text-[12.5px] leading-[var(--app-lh-snug)] text-[var(--app-fg-muted)]">
            No games are uploaded, only their titles and durations. You can revoke tracking anytime
            in Settings → Devices.
          </p>
        </div>
      </div>
    </OnboardingLayout>
  )
}
