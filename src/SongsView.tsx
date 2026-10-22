import { useState, type FormEvent } from 'react'
import { formatDuration, newId, parseDuration, type Song } from './lib/setlist'

interface Props {
  songs: Song[]
  onAdd: (song: Song) => void
  onDelete: (id: string) => void
}

export function SongsView({ songs, onAdd, onDelete }: Props) {
  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')
  const [key, setKey] = useState('')
  const [bpm, setBpm] = useState('')
  const [duration, setDuration] = useState('')
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')

  function submit(e: FormEvent) {
    e.preventDefault()
    const durationSec = parseDuration(duration)
    if (!title.trim()) return setError('Title is required.')
    if (durationSec === null) return setError('Duration must look like 3:45.')
    const bpmNum = bpm.trim() === '' ? null : Number(bpm)
    if (bpmNum !== null && (!Number.isInteger(bpmNum) || bpmNum < 20 || bpmNum > 300)) {
      return setError('BPM must be a whole number between 20 and 300.')
    }
    onAdd({
      id: newId(),
      title: title.trim(),
      artist: artist.trim(),
      key: key.trim(),
      bpm: bpmNum,
      durationSec,
    })
    setTitle('')
    setArtist('')
    setKey('')
    setBpm('')
    setDuration('')
    setError('')
  }

  const q = query.trim().toLowerCase()
  const visible = songs.filter(
    (s) => !q || s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q),
  )

  return (
    <section aria-labelledby="songs-heading">
      <h2 id="songs-heading">Song library</h2>

      <form onSubmit={submit} className="card form-grid" aria-label="Add song">
        <label>
          Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label>
          Artist
          <input value={artist} onChange={(e) => setArtist(e.target.value)} />
        </label>
        <label>
          Key
          <input value={key} onChange={(e) => setKey(e.target.value)} placeholder="e.g. Am" />
        </label>
        <label>
          BPM
          <input value={bpm} onChange={(e) => setBpm(e.target.value)} inputMode="numeric" />
        </label>
        <label>
          Duration (m:ss)
          <input value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="3:45" />
        </label>
        <button type="submit">Add song</button>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
      </form>

      <label className="search">
        Search songs
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} />
      </label>

      {songs.length === 0 ? (
        <p className="muted">No songs yet. Add your first song above.</p>
      ) : visible.length === 0 ? (
        <p className="muted">No songs match your search.</p>
      ) : (
        <ul className="list" aria-label="Songs">
          {visible.map((s) => (
            <li key={s.id} className="row">
              <div>
                <strong>{s.title}</strong>
                {s.artist && <span className="muted"> — {s.artist}</span>}
                <div className="meta">
                  {[s.key && `Key ${s.key}`, s.bpm && `${s.bpm} BPM`, formatDuration(s.durationSec)]
                    .filter(Boolean)
                    .join(' · ')}
                </div>
              </div>
              <button type="button" className="danger" onClick={() => onDelete(s.id)}>
                Delete <span className="sr-only">{s.title}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
