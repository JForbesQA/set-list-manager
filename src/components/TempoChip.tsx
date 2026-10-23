import type { Tempo } from '../lib/setlist'

const LABEL: Record<Tempo, string> = { slow: 'Slow', medium: 'Medium', high: 'High' }

export function TempoChip({ tempo }: { tempo: Tempo | null }) {
  if (!tempo) return null
  return <span className={`chip chip-${tempo}`}>{LABEL[tempo]}</span>
}
