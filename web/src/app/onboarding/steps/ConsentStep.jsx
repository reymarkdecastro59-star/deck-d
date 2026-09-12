import { Link } from 'react-router-dom'
import { Checkbox } from '@/app/ui/Checkbox'
import { Button } from '@/app/ui/Button'
import { OnboardingLayout } from '../OnboardingLayout'
import { CONSENT_VERSION } from '../state'

export function ConsentStep({ state, onChange, onNext, stepIdx, totalSteps }) {
  const { consent } = state
  const allRequired = consent.tos && consent.privacy

  const set = (key) => (val) => onChange({ ...state, consent: { ...consent, [key]: val } })

  return (
    <OnboardingLayout
      stepIdx={stepIdx}
      totalSteps={totalSteps}
      eyebrow="Step 1 of 4"
      title="Let's get you set up"
      lede="A couple of quick agreements before we activate your account. You can revisit these anytime in Settings."
      footer={
        <>
          <span className="text-[13px] text-[var(--app-fg-muted)]">
            Items marked <span className="text-[var(--app-danger)]">*</span> are required.
          </span>
          <Button variant="primary" onClick={onNext} disabled={!allRequired}>
            Agree and continue
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="space-y-4 rounded-[var(--app-r-3)] border border-[var(--app-border)] bg-[var(--app-bg-2)] p-5">
          <ConsentRow
            checked={consent.tos}
            onChange={set('tos')}
            required
            title="Terms of Service"
            body={
              <>
                I've read and agree to the{' '}
                <Link
                  to="/legal/terms"
                  target="_blank"
                  rel="noreferrer"
                  className="underline decoration-[var(--app-border-strong)] underline-offset-2 hover:text-[var(--app-fg)]"
                >
                  DECK'D terms of use
                </Link>
                .
              </>
            }
          />
          <ConsentRow
            checked={consent.privacy}
            onChange={set('privacy')}
            required
            title="Privacy Policy"
            body={
              <>
                I understand DECK'D stores my gameplay sessions, tracked game titles, and account
                email — as described in the{' '}
                <Link
                  to="/legal/privacy"
                  target="_blank"
                  rel="noreferrer"
                  className="underline decoration-[var(--app-border-strong)] underline-offset-2 hover:text-[var(--app-fg)]"
                >
                  privacy policy
                </Link>
                . My data is exportable and deletable at any time.
              </>
            }
          />
          <ConsentRow
            checked={consent.telemetry}
            onChange={set('telemetry')}
            title="Anonymous product telemetry"
            body="Optional. Helps improve DECK'D by sending anonymous usage events. No gameplay data is included."
          />
        </div>
        <p className="text-[12px] text-[var(--app-fg-dim)]">
          Consent version {CONSENT_VERSION}. Revoke anytime in Settings → Data &amp; Privacy.
        </p>
      </div>
    </OnboardingLayout>
  )
}

function ConsentRow({ checked, onChange, title, body, required }) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <span className="pt-0.5">
        <Checkbox checked={checked} onChange={onChange} />
      </span>
      <span className="flex-1">
        <span className="flex items-center gap-1.5">
          <span className="text-[14px] font-medium text-[var(--app-fg)]">{title}</span>
          {required && (
            <span className="text-[13px] text-[var(--app-danger)]" aria-label="required">
              *
            </span>
          )}
        </span>
        <span className="mt-1 block text-[13px] leading-[var(--app-lh-snug)] text-[var(--app-fg-muted)]">
          {body}
        </span>
      </span>
    </label>
  )
}
