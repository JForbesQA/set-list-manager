import { useState } from 'react'
import { Modal } from './Modal'
import { TempoChip } from './TempoChip'
import { filterSongs, NO_FILTER } from '../lib/search'
import { formatDuration, type SetList, type Song } from '../lib/setlist'
import { addedSeconds, timeLeftText } from '../lib/timebar'

interface Props {
  songs: Song[]
  set: SetList
  gapSec: number
  /** Seconds the set currently runs for. */
  currentTotal: number
  /** Time target in seconds when the set was made for a time slot, otherwise null. */
  targetSec: number | null
  onAdd: (songIds: string[]) => void
  onClose: () => void
}

/** Search-as-you-type picker: tick any number of songs, then add them all at once. */
export function AddSongsModal({ songs, set, gapSec, currentTotal, targetSec, onAdd, onClose }: Props) {
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState<string[]>([]) // in the order they were ticked

  const inSet = new Set(set.songIds)
  const candidates = filterSongs(
    songs.filter((s) => !inSet.has(s.id)),
    { ...NO_FILTER, query },
  )
  const pickedSongs = picked.flatMap((id) => songs.find((s) => s.id === id) ?? [])
  const extra = addedSeconds(set.songIds.length, pickedSongs, gapSec)
  const projected = currentTotal + extra

  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))

  return (
    <Modal title="Add songs" onClose={onClose}>
      <div className="stack">
        <input
          type="search"
          data-autofocus
          aria-label="Search your library"
          placeholder="Type a song or artist"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {songs.length === 0 ? (
          <p className="muted">Your library is empty. Add songs on the Songs tab first.</p>
        ) : candidates.length === 0 ? (
          <p className="muted">{query ? 'No songs match.' : 'Every song in your library is already in this set.'}</p>
        ) : (
          <ul className="pick-list" aria-label="Songs to add">
            {candidates.map((s) => (
              <li key={s.id}>
                <label className="pick-row" data-tempo={s.tempo ?? 'none'}>
                  <input type="checkbox" checked={picked.includes(s.id)} onChange={() => toggle(s.id)} />
                  <span className="pick-main">
                    <span className="pick-title">{s.title}</span>
                    {s.artist && <span className="pick-artist">{s.artist}</span>}
                  </span>
                  <TempoChip tempo={s.tempo} />
                  <span className="pick-time">{formatDuration(s.durationSec)}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
        <div className="pick-footer">
          <p className="meta" aria-live="polite">
            {picked.length === 0
              ? targetSec !== null
                ? `Set is at ${formatDuration(currentTotal)}, ${timeLeftText(currentTotal, targetSec)}.`
                : `Set is at ${formatDuration(currentTotal)}.`
              : `${picked.length} selected · adds ${formatDuration(extra)} → ${formatDuration(projected)}${
                  targetSec !== null ? ` (${timeLeftText(projected, targetSec)})` : ''
                }`}
          </p>
          <div className="modal-actions">
            <button
              type="button"
              className="primary"
              disabled={picked.length === 0}
              onClick={() => {
                onAdd(picked)
                onClose()
              }}
            >
              {picked.length > 0 ? `Add ${picked.length} ${picked.length === 1 ? 'song' : 'songs'}` : 'Add songs'}
            </button>
            <button type="button" className="ghost" onClick={onClose}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
