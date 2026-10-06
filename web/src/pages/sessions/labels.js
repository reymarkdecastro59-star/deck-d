// Canonical labels the UI offers as quick picks. Backend accepts any string
// (1-64 chars), but the UI stays with a small palette so color coding and
// filtering are predictable. Anything outside this set falls into "other".
export const LABELS = [
  { value: 'focused', title: 'Focused' },
  { value: 'casual', title: 'Casual' },
  { value: 'story', title: 'Story' },
  { value: 'exploration', title: 'Exploration' },
  { value: 'tracked', title: 'Tracked' },
]

export const LABEL_VALUES = LABELS.map((l) => l.value)

export function labelTitle(v) {
  if (!v) return 'Unlabeled'
  const hit = LABELS.find((l) => l.value === v)
  return hit ? hit.title : v
}
