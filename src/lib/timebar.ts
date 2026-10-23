import { timeWindow } from './generator'
import { formatDuration, type Song } from './setlist'

export type TimeStatus = 'under' | 'within' | 'over'

export interface TimeBarModel {
  /** All percentages are of the bar's width. */
  fillPct: number
  windowStartPct: number
  windowEndPct: number
  status: TimeStatus
}

/** Where a set's total sits against a time target and the accepted window around it. */
export function timeBarModel(totalSec: number, targetSec: number): TimeBarModel {
  const { under, over } = timeWindow(targetSec)
  const scale = Math.max(targetSec * 1.15, totalSec * 1.05, 1)
  const pct = (sec: number) => Math.min(100, Math.max(0, (sec / scale) * 100))
  const status: TimeStatus = totalSec < targetSec - under ? 'under' : totalSec > targetSec + over ? 'over' : 'within'
  return {
    fillPct: pct(totalSec),
    windowStartPct: pct(targetSec - under),
    windowEndPct: pct(targetSec + over),
    status,
  }
}

/** Short plain-language note: how much is left to fill, or how far over. */
export function timeLeftText(totalSec: number, targetSec: number): string {
  const { under, over } = timeWindow(targetSec)
  if (totalSec >= targetSec - under && totalSec <= targetSec + over) return 'on target'
  const diff = targetSec - totalSec
  return diff > 0 ? `${formatDuration(diff)} left to fill` : `${formatDuration(-diff)} over`
}

/** Seconds that adding `added` songs would add to a set that already has `currentCount` songs. */
export function addedSeconds(currentCount: number, added: Pick<Song, 'durationSec'>[], gapSec = 0): number {
  if (added.length === 0) return 0
  const music = added.reduce((sum, s) => sum + s.durationSec, 0)
  const gaps = currentCount > 0 ? added.length : added.length - 1
  return music + gaps * gapSec
}
