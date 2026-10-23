import type { Tempo } from '../lib/setlist'

/** One coloured segment per song, in order, so the energy arc of a set shows at a glance. */
export function EnergyStrip({ tempos }: { tempos: (Tempo | null)[] }) {
  if (tempos.length === 0) return null
  const label = `Tempo flow: ${tempos.map((t) => t ?? 'unset').join(' → ')}`
  return (
    <div className="energy" role="img" aria-label={label}>
      {tempos.map((t, i) => (
        <span key={i} className={`energy-seg energy-${t ?? 'none'}`} />
      ))}
    </div>
  )
}
