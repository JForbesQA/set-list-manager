/** App-wide preferences. Kept deliberately small. */
export interface Settings {
  /**
   * Seconds allowed between songs (tuning, banter, applause), 0 to ignore. Counted when totalling a set
   * and when filling a time slot, so the number of songs that fit is realistic.
   */
  gapSec: number
}

export const DEFAULT_SETTINGS: Settings = { gapSec: 0 }

export const MAX_GAP_SEC = 180

export function normalizeSettings(raw: unknown): Settings {
  const r = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {}
  const gap = typeof r.gapSec === 'number' && Number.isFinite(r.gapSec) ? Math.round(r.gapSec) : 0
  return { gapSec: Math.min(MAX_GAP_SEC, Math.max(0, gap)) }
}
