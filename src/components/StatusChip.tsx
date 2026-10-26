const TONES: Record<string, string> = {
  Alive: 'good',
  Friendly: 'good',
  Completed: 'good',
  Active: 'info',
  Neutral: 'neutral',
  'On hold': 'neutral',
  Unknown: 'neutral',
  Missing: 'warn',
  Hostile: 'bad',
  Dead: 'bad',
  Failed: 'bad',
}

export function StatusChip({ value }: { value: string }) {
  return <span className={`chip ${TONES[value] ?? 'neutral'}`}>{value}</span>
}
