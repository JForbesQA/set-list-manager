import { useState, type FormEvent } from 'react'
import { Modal } from './components/Modal'
import { PlusIcon } from './components/icons'
import { TempoChip } from './components/TempoChip'
import { STARTER_COUNT } from './data/starterLibrary'
import { describeKey, MAX_CAPO, shapeKey } from './lib/chords'
import { filterSongs, NO_FILTER, type SongFilter } from './lib/search'
import {
  formatDuration,
  isTempo,
  lastPlayed,
  newId,
  parseDuration,
  TEMPOS,
  type SetList,
  type Song,
  type Tempo,
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

interface FormProps {
  /** The song being edited, or null when adding. */
  song: Song | null
  onSave: (song: Song) => void
  onClose: () => void
}

function SongForm({ song, onSave, onClose }: FormProps) {
  const [form, setForm] = useState(
    song
      ? {
          title: song.title,
          artist: song.artist,
          key: song.key,
          capo: String(song.capo),
          tempo: song.tempo ?? '',
          duration: formatDuration(song.durationSec),
          notes: song.notes,
        }
      : EMPTY,
  )
  const [error, setError] = useState('')
  const [added, setAdded] = useState('')

  const field = (name: keyof typeof EMPTY) => ({
    value: form[name],
    onChange: (e: { target: { value: string } }) => setForm({ ...form, [name]: e.target.value }),
  })

  /** Returns true when the song was valid and saved. */
  function save(): boolean {
    const durationSec = parseDuration(form.duration)
    if (!form.title.trim()) {
      setError('Title is required.')
      return false
    }
    if (durationSec === null) {
      setError('Duration must look like 3:45.')
      return false
    }
    onSave({
      id: song?.id ?? newId(),
      title: form.title.trim(),
      artist: form.artist.trim(),
      key: form.key.trim(),
      capo: Number(form.capo),
      tempo: isTempo(form.tempo) ? form.tempo : null,
      durationSec,
      notes: form.notes.trim(),
      needsReview: false,
    })
    return true
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    if (save()) onClose()
  }

  function saveAndAddAnother() {
    const title = form.title.trim()
    if (save()) {
      setAdded(`Added ${title}. Add the next one.`)
      setError('')
      setForm(EMPTY)
      document.querySelector<HTMLElement>('[data-autofocus]')?.focus()
    }
  }

  const shapes = Number(form.capo) > 0 && form.key.trim() ? shapeKey(form.key, Number(form.capo)) : null

  return (
    <form onSubmit={submit} className="stack" aria-label={song ? 'Edit song' : 'Add song'}>
      <div className="form-grid">
        <label className="wide">
          Title
          <input data-autofocus {...field('title')} />
        </label>
        <label className="wide">
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
          <input {...field('notes')} placeholder="Tuning, which version you play…" />
        </label>
      </div>
      {Number(form.capo) > 0 && form.key.trim() && (
        <p className="meta">
          {shapes
            ? `Playing ${form.key.trim()} with the capo on fret ${form.capo} means you finger ${shapes} shapes.`
            : 'Enter the key like F#m or Bb to see the shapes.'}
        </p>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {added && (
        <p role="status" className="notice">
          {added}
        </p>
      )}
      <div className="modal-actions">
        <button type="submit" className="primary">
          {song ? 'Save changes' : 'Add song'}
        </button>
        {!song && (
          <button type="button" onClick={saveAndAddAnother}>
            Add and add another
          </button>
        )}
        <button type="button" className="ghost" onClick={onClose}>
          Cancel
        </button>
      </div>
    </form>
  )
}

export function SongsView({ songs, setLists, onSave, onDelete, onLoadStarter }: Props) {
  const [modal, setModal] = useState<{ song: Song | null } | null>(null)
  const [filter, setFilter] = useState<SongFilter>(NO_FILTER)
  const [notice, setNotice] = useState('')
  // Read once when the tab opens (en-CA formats as YYYY-MM-DD), so gigs that have not happened yet are not 'played'.
  const [today] = useState(() => new Date().toLocaleDateString('en-CA'))

  const reviewCount = songs.filter((s) => s.needsReview).length
  const visible = filterSongs(songs, filter)
  const filtering = filter.query.trim() !== '' || filter.reviewOnly || filter.tempos.length > 0

  const toggleTempo = (t: Tempo) =>
    setFilter({
      ...filter,
      tempos: filter.tempos.includes(t) ? filter.tempos.filter((x) => x !== t) : [...filter.tempos, t],
    })

  function remove(song: Song) {
    if (window.confirm(`Delete ${song.title}? It will also be removed from any set lists.`)) onDelete(song.id)
  }

  return (
    <section aria-labelledby="songs-heading">
      <div className="page-head">
        <h2 id="songs-heading">Song library ({songs.length})</h2>
        <button type="button" className="primary with-icon" onClick={() => setModal({ song: null })}>
          <PlusIcon />
          Add song
        </button>
      </div>

      {songs.length < 10 && (
        <div className="card">
          <p>
            Start with your repertoire: load {STARTER_COUNT} songs with drafted durations, keys and tempos. They are
            flagged <strong>Needs review</strong> so you can confirm or correct each one.
          </p>
          <button
            type="button"
            className="primary"
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
            <span className="sr-only">Search songs</span>
            <input
              type="search"
              placeholder="Search songs or artists"
              aria-label="Search songs"
              value={filter.query}
              onChange={(e) => setFilter({ ...filter, query: e.target.value })}
            />
          </label>
          <div className="chip-row" role="group" aria-label="Filter songs">
            {reviewCount > 0 && (
              <button
                type="button"
                className="filter-chip"
                aria-pressed={filter.reviewOnly}
                onClick={() => setFilter({ ...filter, reviewOnly: !filter.reviewOnly })}
              >
                Needs review ({reviewCount})
              </button>
            )}
            {TEMPOS.map((t) => (
              <button
                key={t}
                type="button"
                className={`filter-chip filter-${t}`}
                aria-pressed={filter.tempos.includes(t)}
                onClick={() => toggleTempo(t)}
              >
                {t[0].toUpperCase() + t.slice(1)}
              </button>
            ))}
            {filtering && (
              <button type="button" className="ghost small" onClick={() => setFilter(NO_FILTER)}>
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      {songs.length > 0 && visible.length === 0 ? (
        <p className="muted">No songs match.</p>
      ) : (
        <ul className="list" aria-label="Songs">
          {visible.map((s) => {
            const played = lastPlayed(s.id, setLists, today)
            const key = describeKey(s)
            return (
              <li key={s.id} className="row song-row" data-tempo={s.tempo ?? 'none'}>
                <div className="row-main">
                  <div className="row-title">
                    <strong>{s.title}</strong>
                    {s.needsReview && <span className="badge">Needs review</span>}
                  </div>
                  {s.artist && <div className="row-sub">{s.artist}</div>}
                  <div className="row-meta">
                    <TempoChip tempo={s.tempo} />
                    {key && <span className="chip">{key}</span>}
                    <span>{formatDuration(s.durationSec)}</span>
                    <span>{played ? `Played ${formatDate(played)}` : 'Never played'}</span>
                  </div>
                  {s.notes && <div className="row-notes">{s.notes}</div>}
                </div>
                <div className="row-actions">
                  {s.needsReview && (
                    <button type="button" className="small primary" onClick={() => onSave({ ...s, needsReview: false })}>
                      Confirm <span className="sr-only">{s.title}</span>
                    </button>
                  )}
                  <button type="button" className="small" onClick={() => setModal({ song: s })}>
                    Edit <span className="sr-only">{s.title}</span>
                  </button>
                  <button type="button" className="small danger" onClick={() => remove(s)}>
                    Delete <span className="sr-only">{s.title}</span>
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {modal && (
        <Modal title={modal.song ? 'Edit song' : 'Add a song'} onClose={() => setModal(null)}>
          <SongForm song={modal.song} onSave={onSave} onClose={() => setModal(null)} />
        </Modal>
      )}
    </section>
  )
}
