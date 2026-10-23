import { formatDuration } from '../lib/setlist'
import { timeBarModel, timeLeftText } from '../lib/timebar'

interface Props {
  totalSec: number
  songCount: number
  /** Target in seconds when the set was made for a time slot, otherwise null. */
  targetSec: number | null
  /** Extra words after the total, e.g. "(includes 45s between songs)". */
  note?: string
}

export function TimeBar({ totalSec, songCount, targetSec, note }: Props) {
  const total = formatDuration(totalSec)
  if (targetSec === null) {
    return (
      <p className="timebar-text" data-testid="set-total">
        {total} · {songCount} songs{note ? ` ${note}` : ''}
      </p>
    )
  }
  const m = timeBarModel(totalSec, targetSec)
  return (
    <div className="timebar">
      <p className="timebar-text" data-testid="set-total">
        {total} of about {Math.round(targetSec / 60)} min · {songCount} songs · {timeLeftText(totalSec, targetSec)}
        {note ? ` ${note}` : ''}
      </p>
      <div className={`timebar-track timebar-${m.status}`} aria-hidden="true">
        <span
          className="timebar-window"
          style={{ left: `${m.windowStartPct}%`, width: `${Math.max(0, m.windowEndPct - m.windowStartPct)}%` }}
        />
        <span className="timebar-fill" style={{ width: `${m.fillPct}%` }} />
      </div>
    </div>
  )
}
