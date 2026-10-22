import { isTempo, newId, TEMPOS, type Tempo } from './setlist'

export interface Template {
  id: string
  name: string
  /** Stop by number of songs, or by running time. */
  limitType: 'songs' | 'minutes'
  limitValue: number
  /** Relative share of slow / medium / high songs (e.g. 1:2:1). */
  mix: Record<Tempo, number>
  /** Tempo of the first / last song, or null for no preference. */
  opener: Tempo | null
  closer: Tempo | null
  /**
   * How closely to follow the tempo mix:
   * strict = exact counts of each tempo, no back-to-back repeats;
   * loose = each slot is a random draw weighted by the mix (any set can drift);
   * any = ignore tempo entirely.
   */
  variety: Variety
  builtIn?: boolean
}

export type Variety = 'strict' | 'loose' | 'any'

export const VARIETY_LABELS: Record<Variety, string> = {
  strict: 'Strict: exact mix, no repeats back to back',
  loose: 'Loose: random, weighted by the mix',
  any: 'Anything goes: ignore tempo',
}

// Weighted towards medium and high tempo songs (high the most) for a lively room.
export const BUILT_IN_TEMPLATES: Template[] = [
  {
    id: 'open-mic-opener',
    name: 'Open mic opener',
    limitType: 'songs',
    limitValue: 4,
    mix: { slow: 1, medium: 3, high: 4 },
    opener: 'medium',
    closer: 'high',
    variety: 'loose',
    builtIn: true,
  },
  {
    id: 'short-set-30',
    name: 'Short set (30 min)',
    limitType: 'minutes',
    limitValue: 30,
    mix: { slow: 1, medium: 3, high: 4 },
    opener: 'medium',
    closer: 'high',
    variety: 'loose',
    builtIn: true,
  },
  {
    id: 'short-set',
    name: 'Short set (45 min)',
    limitType: 'minutes',
    limitValue: 45,
    mix: { slow: 1, medium: 3, high: 4 },
    opener: 'medium',
    closer: 'high',
    variety: 'loose',
    builtIn: true,
  },
  {
    id: 'full-show',
    // A 3-hour slot is roughly 2 hours of music once breaks and banter are counted.
    name: 'Full show (3-hour slot)',
    limitType: 'minutes',
    limitValue: 120,
    mix: { slow: 2, medium: 3, high: 4 },
    opener: 'medium',
    closer: 'high',
    variety: 'loose',
    builtIn: true,
  },
  {
    id: 'full-show-4h',
    // Same ratio as the 3-hour slot: about 2 hours 40 minutes of music in 4 hours.
    name: 'Full show (4-hour slot)',
    limitType: 'minutes',
    limitValue: 160,
    mix: { slow: 2, medium: 3, high: 4 },
    opener: 'medium',
    closer: 'high',
    variety: 'loose',
    builtIn: true,
  },
]

export function describeTemplate(t: Template): string {
  const limit = t.limitType === 'songs' ? `${t.limitValue} songs` : `about ${t.limitValue} min`
  const mix = TEMPOS.map((k) => `${t.mix[k]} ${k}`).join(' : ')
  const ends = [t.opener && `opens ${t.opener}`, t.closer && `closes ${t.closer}`].filter(Boolean).join(', ')
  if (t.variety === 'any') return [limit, 'any tempo'].join(' · ')
  return [limit, `${t.variety === 'strict' ? 'exact' : 'weighted'} mix ${mix}`, ends].filter(Boolean).join(' · ')
}

export function normalizeTemplate(raw: unknown): Template | null {
  if (typeof raw !== 'object' || raw === null) return null
  const r = raw as Record<string, unknown>
  const name = typeof r.name === 'string' ? r.name.trim() : ''
  const limitValue = typeof r.limitValue === 'number' ? Math.round(r.limitValue) : 0
  if (!name || limitValue <= 0) return null
  const m = (typeof r.mix === 'object' && r.mix !== null ? r.mix : {}) as Record<string, unknown>
  const weight = (v: unknown) => (typeof v === 'number' && v >= 0 ? v : 0)
  const mix = { slow: weight(m.slow), medium: weight(m.medium), high: weight(m.high) }
  if (mix.slow + mix.medium + mix.high === 0) return null
  return {
    id: typeof r.id === 'string' && r.id ? r.id : newId(),
    name,
    limitType: r.limitType === 'songs' ? 'songs' : 'minutes',
    limitValue,
    mix,
    opener: isTempo(r.opener) ? r.opener : null,
    closer: isTempo(r.closer) ? r.closer : null,
    variety: r.variety === 'strict' || r.variety === 'any' ? r.variety : 'loose',
  }
}
