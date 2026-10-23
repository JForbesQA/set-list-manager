import { useState, type FormEvent } from 'react'
import { EnergyStrip } from './components/EnergyStrip'
import { ChevronRight, PlusIcon } from './components/icons'
import { Modal } from './components/Modal'
import { generateSet } from './lib/generator'
import { generationNotice } from './lib/notices'
import { MAX_GAP_SEC, normalizeSettings } from './lib/settings'
import { formatDuration, newId, setListSongs, totalDuration, type SetList, type Song } from './lib/setlist'
import { describeTemplate, type Template } from './lib/templates'
import { SetDetail } from './SetDetail'

interface Props {
  songs: Song[]
  setLists: SetList[]
  templates: Template[]
  /** Seconds between songs counted in totals and when filling a time slot (0 = ignore). */
  gapSec: number
  onGapChange: (gapSec: number) => void
  onChange: (next: SetList[]) => void
}

export function SetListsView({ songs, setLists, templates, gapSec, onGapChange, onChange }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [newOpen, setNewOpen] = useState(false)
  const [notice, setNotice] = useState('')

  const selected = setLists.find((s) => s.id === selectedId) ?? null

  function open(id: string) {
    setNotice('')
    setSelectedId(id)
  }

  /** Returns an error message to show in the form, or '' when the set list was created. */
  function create(templateId: string, name: string, date: string, venue: string): string {
    const template = templates.find((t) => t.id === templateId) ?? null
    const finalName = name.trim() || template?.name || ''
    if (!finalName) return 'Give the set list a name.'
    let songIds: string[] = []
    let message = ''
    if (template) {
      if (songs.length === 0) return 'Add some songs to your library first.'
      const result = generateSet(template, songs, setLists, { gapSec })
      songIds = result.songIds
      message = generationNotice(template, result.totalSec, songs, gapSec)
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
    setNotice(message)
    setSelectedId(set.id)
    setNewOpen(false)
    return ''
  }

  function update(id: string, patch: Partial<SetList>) {
    onChange(setLists.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  }

  function remove(set: SetList) {
    if (!window.confirm(`Delete ${set.name}?`)) return
    onChange(setLists.filter((s) => s.id !== set.id))
    setSelectedId(null)
  }

  function duplicate(set: SetList) {
    const copy: SetList = { ...set, id: newId(), name: `${set.name} (copy)`, date: '' }
    onChange([...setLists, copy])
    setNotice('')
    setSelectedId(copy.id)
  }

  function regenerate(set: SetList, t: Template) {
    // Ignore this set's own history so it does not penalise its current songs.
    const result = generateSet(
      t,
      songs,
      setLists.filter((s) => s.id !== set.id),
      { gapSec },
    )
    update(set.id, { songIds: result.songIds })
    setNotice(generationNotice(t, result.totalSec, songs, gapSec))
  }

  if (selected) {
    const template = selected.templateId ? templates.find((t) => t.id === selected.templateId) : undefined
    return (
      <SetDetail
        // A new key per set resets the view (sheet or edit) when you open a different one.
        key={selected.id}
        set={selected}
        songs={songs}
        template={template}
        gapSec={gapSec}
        notice={notice}
        onDismissNotice={() => setNotice('')}
        onBack={() => {
          setNotice('')
          setSelectedId(null)
        }}
        onUpdate={(patch) => update(selected.id, patch)}
        onRegenerate={() => template && regenerate(selected, template)}
        onDuplicate={() => duplicate(selected)}
        onDelete={() => remove(selected)}
      />
    )
  }

  return (
    <section aria-labelledby="sets-heading">
      <div className="page-head">
        <h2 id="sets-heading">Set lists</h2>
        <button type="button" className="primary with-icon" onClick={() => setNewOpen(true)}>
          <PlusIcon />
          New set list
        </button>
      </div>

      <details className="timing">
        <summary>Timing: {gapSec > 0 ? `${gapSec}s between songs counted` : 'song lengths only'}</summary>
        <label>
          Time between songs (seconds)
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={MAX_GAP_SEC}
            step={5}
            value={gapSec}
            onChange={(e) => onGapChange(normalizeSettings({ gapSec: Number(e.target.value) }).gapSec)}
          />
        </label>
        <p className="meta">
          Optional. Adds a pause for tuning and banter between songs when totalling a set and when filling a time slot,
          so the number of songs that fit is more realistic. Leave at 0 to count song lengths only.
        </p>
      </details>

      {setLists.length === 0 ? (
        <div className="card empty">
          <p>No set lists yet.</p>
          <p className="meta">Create one from a template and it is built from your library, or start blank.</p>
        </div>
      ) : (
        <ul className="list" aria-label="Set lists">
          {[...setLists].reverse().map((s) => {
            const inSet = setListSongs(s, songs)
            return (
              <li key={s.id}>
                <button type="button" className="set-card" aria-label={`Open ${s.name}`} onClick={() => open(s.id)}>
                  <span className="set-card-main">
                    <strong>{s.name}</strong>
                    <span className="meta">
                      {[s.date, s.venue, `${inSet.length} songs`, formatDuration(totalDuration(s, songs, gapSec))]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                    <EnergyStrip tempos={inSet.map((x) => x.tempo)} />
                  </span>
                  <ChevronRight />
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {newOpen && (
        <Modal title="New set list" onClose={() => setNewOpen(false)}>
          <NewSetForm templates={templates} onCreate={create} onCancel={() => setNewOpen(false)} />
        </Modal>
      )}
    </section>
  )
}

interface NewFormProps {
  templates: Template[]
  onCreate: (templateId: string, name: string, date: string, venue: string) => string
  onCancel: () => void
}

function NewSetForm({ templates, onCreate, onCancel }: NewFormProps) {
  const [templateId, setTemplateId] = useState('')
  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [venue, setVenue] = useState('')
  const [error, setError] = useState('')
  const template = templates.find((t) => t.id === templateId) ?? null

  function submit(e: FormEvent) {
    e.preventDefault()
    setError(onCreate(templateId, name, date, venue))
  }

  return (
    <form onSubmit={submit} className="stack" aria-label="Create set list">
      <div className="form-grid">
        <label className="wide">
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
        {template && <p className="meta wide">{describeTemplate(template)}</p>}
        <label className="wide">
          Set list name
          <input data-autofocus value={name} onChange={(e) => setName(e.target.value)} placeholder={template?.name} />
        </label>
        <label>
          Date
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label>
          Venue
          <input value={venue} onChange={(e) => setVenue(e.target.value)} />
        </label>
      </div>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <div className="modal-actions">
        <button type="submit" className="primary">
          {template ? 'Generate set list' : 'Create set list'}
        </button>
        <button type="button" className="ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  )
}
