import { useState, type FormEvent } from 'react'
import { generateSet } from './lib/generator'
import {
  compareSongs,
  formatDuration,
  moveItem,
  newId,
  setListSongs,
  totalDuration,
  type SetList,
  type Song,
} from './lib/setlist'
import { describeTemplate, type Template } from './lib/templates'

interface Props {
  songs: Song[]
  setLists: SetList[]
  templates: Template[]
  onChange: (next: SetList[]) => void
}

export function SetListsView({ songs, setLists, templates, onChange }: Props) {
  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [venue, setVenue] = useState('')
  const [templateId, setTemplateId] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [addId, setAddId] = useState('')
  const [notice, setNotice] = useState('')

  const selected = setLists.find((s) => s.id === selectedId) ?? null
  const template = templates.find((t) => t.id === templateId) ?? null

  function shortfallNotice(t: Template, totalSec: number): string {
    if (t.limitType === 'minutes' && totalSec < t.limitValue * 60 * 0.9) {
      return `Your library only has ${formatDuration(totalSec)} of music to work with, so this set is shorter than the ${t.limitValue} minute target. Add more songs to fill it.`
    }
    if (t.limitType === 'songs' && songs.length < t.limitValue) {
      return `Your library only has ${songs.length} songs, so this set has fewer than ${t.limitValue}.`
    }
    return ''
  }

  function create(e: FormEvent) {
    e.preventDefault()
    const finalName = name.trim() || template?.name || ''
    if (!finalName) return
    let songIds: string[] = []
    let message = ''
    if (template) {
      if (songs.length === 0) return setNotice('Add some songs to your library first.')
      const result = generateSet(template, songs, setLists)
      songIds = result.songIds
      message = shortfallNotice(template, result.totalSec)
    }
    const set: SetList = {
      id: newId(),
      name: finalName,
      date,
      venue: venue.trim(),
      songIds,
      ...(template ? { templateId: template.id } : {}),
    }
    onChange([...setLists, set])
    setSelectedId(set.id)
    setNotice(message)
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

  function duplicate(set: SetList) {
    const copy: SetList = { ...set, id: newId(), name: `${set.name} (copy)`, date: '' }
    onChange([...setLists, copy])
    setSelectedId(copy.id)
  }

  function regenerate(set: SetList, t: Template) {
    // Ignore this set's own history so it does not penalise its current songs.
    const result = generateSet(
      t,
      songs,
      setLists.filter((s) => s.id !== set.id),
    )
    update(set.id, { songIds: result.songIds })
    setNotice(shortfallNotice(t, result.totalSec))
  }

  const inSet = selected ? setListSongs(selected, songs) : []
  const available = selected ? songs.filter((s) => !selected.songIds.includes(s.id)).sort(compareSongs) : []
  const selectedTemplate = selected?.templateId ? templates.find((t) => t.id === selected.templateId) : undefined

  return (
    <section aria-labelledby="sets-heading">
      <h2 id="sets-heading">Set lists</h2>

      <form onSubmit={create} className="card form-grid" aria-label="Create set list">
        <label>
          Start from
          <select value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
            <option value="">Blank set list</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                Generate: {t.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Set list name
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={template?.name} />
        </label>
        <label>
          Date
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label>
          Venue
          <input value={venue} onChange={(e) => setVenue(e.target.value)} />
        </label>
        <button type="submit">{template ? 'Generate set list' : 'Create set list'}</button>
        {template && <p className="meta wide">{describeTemplate(template)}</p>}
      </form>

      {notice && (
        <p role="status" className="notice">
          {notice}
        </p>
      )}

      {setLists.length === 0 ? (
        <p className="muted">No set lists yet. Create or generate one above.</p>
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
                <button type="button" onClick={() => duplicate(s)}>
                  Duplicate <span className="sr-only">{s.name}</span>
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
          <div className="form-grid">
            <label>
              Name
              <input value={selected.name} onChange={(e) => update(selected.id, { name: e.target.value })} />
            </label>
            <label>
              Date
              <input type="date" value={selected.date} onChange={(e) => update(selected.id, { date: e.target.value })} />
            </label>
            <label>
              Venue
              <input value={selected.venue} onChange={(e) => update(selected.id, { venue: e.target.value })} />
            </label>
          </div>
          <p className="meta" data-testid="set-total">
            Total time: {formatDuration(totalDuration(selected, songs))} · {inSet.length} songs
          </p>
          {inSet.length > 1 && (
            <p className="meta">Tempo flow: {inSet.map((s) => s.tempo ?? '?').join(' → ')}</p>
          )}
          {selectedTemplate && (
            <button type="button" onClick={() => regenerate(selected, selectedTemplate)}>
              Regenerate from {selectedTemplate.name}
            </button>
          )}

          {inSet.length === 0 ? (
            <p className="muted">This set is empty. Add songs below.</p>
          ) : (
            <ol className="list" aria-label={`Songs in ${selected.name}`}>
              {inSet.map((s, i) => (
                <li key={s.id} className="row">
                  <div>
                    <strong>{s.title}</strong>
                    {s.artist && <span className="muted"> — {s.artist}</span>}
                    <div className="meta">
                      {[s.key && `Key ${s.key}`, s.tempo && `${s.tempo} tempo`, formatDuration(s.durationSec)]
                        .filter(Boolean)
                        .join(' · ')}
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
                    {s.artist ? ` — ${s.artist}` : ''}
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
