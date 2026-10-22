import { useState, type FormEvent } from 'react'
import {
  formatDuration,
  moveItem,
  newId,
  setListSongs,
  totalDuration,
  type SetList,
  type Song,
} from './lib/setlist'

interface Props {
  songs: Song[]
  setLists: SetList[]
  onChange: (next: SetList[]) => void
}

export function SetListsView({ songs, setLists, onChange }: Props) {
  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [venue, setVenue] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [addId, setAddId] = useState('')

  const selected = setLists.find((s) => s.id === selectedId) ?? null

  function create(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    const set: SetList = { id: newId(), name: name.trim(), date, venue: venue.trim(), songIds: [] }
    onChange([...setLists, set])
    setSelectedId(set.id)
    setName('')
    setDate('')
    setVenue('')
  }

  function update(id: string, patch: Partial<SetList>) {
    onChange(setLists.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  }

  function remove(id: string) {
    onChange(setLists.filter((s) => s.id !== id))
    if (selectedId === id) setSelectedId(null)
  }

  const inSet = selected ? setListSongs(selected, songs) : []
  const available = selected ? songs.filter((s) => !selected.songIds.includes(s.id)) : []

  return (
    <section aria-labelledby="sets-heading">
      <h2 id="sets-heading">Set lists</h2>

      <form onSubmit={create} className="card form-grid" aria-label="Create set list">
        <label>
          Set list name
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          Date
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label>
          Venue
          <input value={venue} onChange={(e) => setVenue(e.target.value)} />
        </label>
        <button type="submit">Create set list</button>
      </form>

      {setLists.length === 0 ? (
        <p className="muted">No set lists yet. Create one above.</p>
      ) : (
        <ul className="list" aria-label="Set lists">
          {setLists.map((s) => (
            <li key={s.id} className="row">
              <div>
                <strong>{s.name}</strong>
                <div className="meta">
                  {[s.date, s.venue, `${s.songIds.length} songs`, formatDuration(totalDuration(s, songs))]
                    .filter(Boolean)
                    .join(' · ')}
                </div>
              </div>
              <div className="actions">
                <button type="button" onClick={() => setSelectedId(s.id)}>
                  Open <span className="sr-only">{s.name}</span>
                </button>
                <button type="button" className="danger" onClick={() => remove(s.id)}>
                  Delete <span className="sr-only">{s.name}</span>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <article className="card" aria-labelledby="set-detail-heading">
          <h3 id="set-detail-heading">{selected.name}</h3>
          <p className="meta" data-testid="set-total">
            Total time: {formatDuration(totalDuration(selected, songs))} · {inSet.length} songs
          </p>

          {inSet.length === 0 ? (
            <p className="muted">This set is empty. Add songs below.</p>
          ) : (
            <ol className="list" aria-label={`Songs in ${selected.name}`}>
              {inSet.map((s, i) => (
                <li key={s.id} className="row">
                  <div>
                    <strong>{s.title}</strong>
                    <div className="meta">
                      {[s.key && `Key ${s.key}`, formatDuration(s.durationSec)].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                  <div className="actions">
                    <button
                      type="button"
                      disabled={i === 0}
                      onClick={() => update(selected.id, { songIds: moveItem(selected.songIds, i, i - 1) })}
                    >
                      Move up <span className="sr-only">{s.title}</span>
                    </button>
                    <button
                      type="button"
                      disabled={i === inSet.length - 1}
                      onClick={() => update(selected.id, { songIds: moveItem(selected.songIds, i, i + 1) })}
                    >
                      Move down <span className="sr-only">{s.title}</span>
                    </button>
                    <button
                      type="button"
                      className="danger"
                      onClick={() => update(selected.id, { songIds: selected.songIds.filter((id) => id !== s.id) })}
                    >
                      Remove <span className="sr-only">{s.title}</span>
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          )}

          <div className="add-song">
            <label>
              Add song to set
              <select value={addId} onChange={(e) => setAddId(e.target.value)}>
                <option value="">Choose a song…</option>
                {available.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              disabled={!addId}
              onClick={() => {
                update(selected.id, { songIds: [...selected.songIds, addId] })
                setAddId('')
              }}
            >
              Add to set
            </button>
          </div>
        </article>
      )}
    </section>
  )
}
