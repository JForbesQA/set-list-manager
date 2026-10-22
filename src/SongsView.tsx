import { useState, type FormEvent } from 'react'
import { STARTER_COUNT } from './data/starterLibrary'
import { describeKey, MAX_CAPO, shapeKey } from './lib/chords'
import {
  compareSongs,
  formatDuration,
  isTempo,
  lastPlayed,
  newId,
  parseDuration,
  type SetList,
  type Song,
} from './lib/setlist'

interface Props {
  songs: Song[]
  setLists: SetList[]
  onSave: (song: Song) => void
  onDelete: (id: string) => void
  onLoadStarter: () => number
}

const EMPTY = { title: '', artist: '', key: '', capo: '0', tempo: '', duration: '', notes: '' }

function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function SongsView({ songs, setLists, onSave, onDelete, onLoadStarter }: Props) {
  const [form, setForm] = useState(EMPTY)
  const [editing, setEditing] = useState<Song | null>(null)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [reviewOnly, setReviewOnly] = useState(false)
  const [notice, setNotice] = useState('')

  const field = (name: keyof typeof EMPTY) => ({
    value: form[name],
    onChange: (e: { target: { value: string } }) => setForm({ ...form, [name]: e.target.value }),
  })

  function reset() {
    setForm(EMPTY)
    setEditing(null)
    setError('')
  }

  function startEdit(song: Song) {
    setEditing(song)
    setError('')
    setForm({
      title: song.title,
      artist: song.artist,
      key: song.key,
      capo: String(song.capo),
      tempo: song.tempo ?? '',
      duration: formatDuration(song.durationSec),
      notes: song.notes,
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    const durationSec = parseDuration(form.duration)
    if (!form.title.trim()) return setError('Title is required.')
    if (durationSec === null) return setError('Duration must look like 3:45.')
    onSave({
      id: editing?.id ?? newId(),
      title: form.title.trim(),
      artist: form.artist.trim(),
      key: form.key.trim(),
      capo: Number(form.capo),
      tempo: isTempo(form.tempo) ? form.tempo : null,
      durationSec,
      notes: form.notes.trim(),
      needsReview: false,
    })
    reset()
  }

  const reviewCount = songs.filter((s) => s.needsReview).length
  const q = query.trim().toLowerCase()
  const visible = songs
    .filter((s) => !reviewOnly || s.needsReview)
    .filter((s) => !q || s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q))
    .sort(compareSongs)

  return (
    <section aria-labelledby="songs-heading">
      <h2 id="songs-heading">Song library ({songs.length})</h2>

      <form onSubmit={submit} className="card form-grid" aria-label={editing ? 'Edit song' : 'Add song'}>
        <label>
          Title
          <input {...field('title')} />
        </label>
        <label>
          Artist
          <input {...field('artist')} />
        </label>
        <label>
          Key you play in
          <input {...field('key')} placeholder="e.g. F#m" />
        </label>
        <label>
          Capo
          <select {...field('capo')}>
            <option value="0">No capo</option>
            {Array.from({ length: MAX_CAPO }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                Fret {i + 1}
              </option>
            ))}
          </select>
        </label>
        <label>
          Tempo
          <select {...field('tempo')}>
            <option value="">Not set</option>
            <option value="slow">Slow</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>
        <label>
          Duration (m:ss)
          <input {...field('duration')} placeholder="3:45" />
        </label>
        <label className="wide">
          Notes
          <input {...field('notes')} placeholder="Capo, tuning, which version you play…" />
        </label>
        {Number(form.capo) > 0 && form.key.trim() && (
          <p className="meta wide">
            {shapeKey(form.key, Number(form.capo))
              ? `Playing ${form.key.trim()} with the capo on fret ${form.capo} means you finger ${shapeKey(form.key, Number(form.capo))} shapes.`
              : 'Enter the key like F#m or Bb to see the shapes.'}
          </p>
        )}
        <div className="actions">
          <button type="submit">{editing ? 'Save changes' : 'Add song'}</button>
          {editing && (
            <button type="button" onClick={reset}>
              Cancel
            </button>
          )}
        </div>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
      </form>

      {songs.length < 10 && (
        <div className="card">
          <p>
            Start with your repertoire: load {STARTER_COUNT} songs with drafted durations, keys and tempos. They are
            flagged <strong>Needs review</strong> so you can confirm or correct each one.
          </p>
          <button
            type="button"
            onClick={() => setNotice(`Added ${onLoadStarter()} songs. Review them below.`)}
          >
            Load starter library
          </button>
        </div>
      )}
      {notice && (
        <p role="status" className="notice">
          {notice}
        </p>
      )}

      {songs.length > 0 && (
        <div className="toolbar">
          <label className="search">
            Search songs
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
          {reviewCount > 0 && (
            <label className="check">
              <input type="checkbox" checked={reviewOnly} onChange={(e) => setReviewOnly(e.target.checked)} />
              Needs review ({reviewCount})
            </label>
          )}
        </div>
      )}

      {songs.length > 0 && visible.length === 0 ? (
        <p className="muted">No songs match.</p>
      ) : (
        <ul className="list" aria-label="Songs">
          {visible.map((s) => {
            const played = lastPlayed(s.id, setLists)
            return (
              <li key={s.id} className="row">
                <div>
                  <strong>{s.title}</strong>
                  {s.artist && <span className="muted"> — {s.artist}</span>}
                  {s.needsReview && <span className="badge">Needs review</span>}
                  <div className="meta">
                    {[
                      describeKey(s),
                      s.tempo && `${s.tempo[0].toUpperCase()}${s.tempo.slice(1)} tempo`,
                      formatDuration(s.durationSec),
                      played ? `Last played ${formatDate(played)}` : 'Never played',
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </div>
                  {s.notes && <div className="meta">{s.notes}</div>}
                </div>
                <div className="actions">
                  {s.needsReview && (
                    <button type="button" onClick={() => onSave({ ...s, needsReview: false })}>
                      Confirm <span className="sr-only">{s.title}</span>
                    </button>
                  )}
                  <button type="button" onClick={() => startEdit(s)}>
                    Edit <span className="sr-only">{s.title}</span>
                  </button>
                  <button type="button" className="danger" onClick={() => onDelete(s.id)}>
                    Delete <span className="sr-only">{s.title}</span>
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
