import { Button } from '@/app/ui/Button'
import { Chip } from '@/app/ui/Chip'
import { Select } from '@/app/ui/Select'
import { OnboardingLayout } from '../OnboardingLayout'

const PLAYSTYLES = ['focused', 'casual', 'story', 'exploration']
const PLAYSTYLE_LABELS = {
  focused: 'Focused sessions',
  casual: 'Casual pick-ups',
  story: 'Story-driven',
  exploration: 'Exploration',
}

const GENRES = [
  'Action',
  'RPG',
  'Strategy',
  'Simulation',
  'Puzzle',
  'Indie',
  'Adventure',
  'Shooter',
  'Racing',
  'Sports',
]

const WEEKLY_BUDGETS = [
  { value: '', label: 'No target' },
  { value: '<5', label: 'Under 5 hours' },
  { value: '5-10', label: '5 – 10 hours' },
  { value: '10-20', label: '10 – 20 hours' },
  { value: '20+', label: '20+ hours' },
]

export function SurveyStep({ state, onChange, onNext, onBack, stepIdx, totalSteps }) {
  const { survey } = state

  const togglePlaystyle = (v) => {
    const has = survey.playstyles.includes(v)
    const playstyles = has ? survey.playstyles.filter((p) => p !== v) : [...survey.playstyles, v]
    onChange({ ...state, survey: { ...survey, playstyles } })
  }

  const toggleGenre = (v) => {
    const has = survey.genres.includes(v)
    const genres = has ? survey.genres.filter((g) => g !== v) : [...survey.genres, v]
    onChange({ ...state, survey: { ...survey, genres } })
  }

  const setBudget = (v) => {
    onChange({ ...state, survey: { ...survey, weeklyBudget: v || null } })
  }

  return (
    <OnboardingLayout
      stepIdx={stepIdx}
      totalSteps={totalSteps}
      eyebrow="Step 2 of 4"
      title="Tell us a bit about how you play"
      lede="This shapes your Recommendations. Answer what feels right, skip what doesn't — you can change everything later in Settings."
      footer={
        <>
          <Button variant="quiet" onClick={onNext}>
            Skip for now
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={onBack}>
              Back
            </Button>
            <Button variant="primary" onClick={onNext}>
              Continue
            </Button>
          </div>
        </>
      }
    >
      <div className="space-y-8">
        <FieldGroup label="How would you describe your usual session?">
          <div className="flex flex-wrap gap-2">
            {PLAYSTYLES.map((p) => (
              <ChipToggle
                key={p}
                selected={survey.playstyles.includes(p)}
                onClick={() => togglePlaystyle(p)}
                label={PLAYSTYLE_LABELS[p]}
                colorLabel={p}
              />
            ))}
          </div>
        </FieldGroup>

        <FieldGroup label="Which genres do you gravitate toward?" hint="Pick any that apply.">
          <div className="flex flex-wrap gap-2">
            {GENRES.map((g) => (
              <ChipToggle
                key={g}
                selected={survey.genres.includes(g)}
                onClick={() => toggleGenre(g)}
                label={g}
              />
            ))}
          </div>
        </FieldGroup>

        <FieldGroup
          label="Weekly play budget"
          hint="We'll use this to gently pace suggestions. No hard limits."
        >
          <Select value={survey.weeklyBudget ?? ''} onChange={setBudget} options={WEEKLY_BUDGETS} />
        </FieldGroup>
      </div>
    </OnboardingLayout>
  )
}

function FieldGroup({ label, hint, children }) {
  return (
    <div>
      <div className="mb-3">
        <p className="text-[13px] font-medium text-[var(--app-fg)]">{label}</p>
        {hint && <p className="mt-0.5 text-[12px] text-[var(--app-fg-muted)]">{hint}</p>}
      </div>
      {children}
    </div>
  )
}

function ChipToggle({ selected, onClick, label, colorLabel }) {
  // When selected + colorLabel present, use the label-color variant so playstyle
  // chips read as the same color the app uses everywhere else for that label.
  if (selected && colorLabel) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="rounded-[var(--app-r-pill)] focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-accent)]"
      >
        <Chip variant="label" label={colorLabel}>
          {label}
        </Chip>
      </button>
    )
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-[var(--app-r-pill)] focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-accent)]"
    >
      <Chip variant={selected ? 'accent' : 'neutral'} selected={selected}>
        {label}
      </Chip>
    </button>
  )
}
