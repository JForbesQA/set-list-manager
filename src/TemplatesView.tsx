import { useState, type FormEvent } from 'react'
import { Modal } from './components/Modal'
import { PlusIcon } from './components/icons'
import { isTempo, newId, TEMPOS, type Tempo } from './lib/setlist'
import { describeTemplate, VARIETY_LABELS, type Template, type Variety } from './lib/templates'

interface Props {
  builtIn: Template[]
  custom: Template[]
  onChange: (next: Template[]) => void
}

interface Draft {
  name: string
  limitType: 'songs' | 'minutes'
  limitValue: string
  mix: Record<Tempo, string>
  opener: string
  closer: string
  variety: Variety
}

const EMPTY: Draft = {
  name: '',
  limitType: 'songs',
  limitValue: '',
  mix: { slow: '1', medium: '3', high: '4' },
  opener: '',
  closer: '',
  variety: 'loose',
}

function toDraft(t: Template): Draft {
  return {
    name: t.name,
    limitType: t.limitType,
    limitValue: String(t.limitValue),
    mix: { slow: String(t.mix.slow), medium: String(t.mix.medium), high: String(t.mix.high) },
    opener: t.opener ?? '',
    closer: t.closer ?? '',
    variety: t.variety,
  }
}

interface FormProps {
  initial: Draft
  /** Set when editing one of your own templates; null when creating a new one. */
  editingId: string | null
  onSave: (template: Template) => void
  onClose: () => void
}

function TemplateForm({ initial, editingId, onSave, onClose }: FormProps) {
  const [draft, setDraft] = useState<Draft>(initial)
  const [error, setError] = useState('')

  function submit(e: FormEvent) {
    e.preventDefault()
    const limitValue = Number(draft.limitValue)
    const mix = {
      slow: Number(draft.mix.slow),
      medium: Number(draft.mix.medium),
      high: Number(draft.mix.high),
    }
    if (!draft.name.trim()) return setError('Name is required.')
    if (!Number.isInteger(limitValue) || limitValue < 1) return setError('Enter a whole number of songs or minutes.')
    if (TEMPOS.some((t) => !Number.isFinite(mix[t]) || mix[t] < 0) || mix.slow + mix.medium + mix.high === 0) {
      return setError('Tempo mix needs at least one number above zero.')
    }
    onSave({
      id: editingId ?? newId(),
      name: draft.name.trim(),
      limitType: draft.limitType,
      limitValue,
      mix,
      opener: isTempo(draft.opener) ? draft.opener : null,
      closer: isTempo(draft.closer) ? draft.closer : null,
      variety: draft.variety,
    })
    onClose()
  }

  const tempoSelect = (label: string, value: string, key: 'opener' | 'closer') => (
    <label>
      {label}
      <select value={value} onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}>
        <option value="">No preference</option>
        {TEMPOS.map((t) => (
          <option key={t} value={t}>
            {t[0].toUpperCase() + t.slice(1)}
          </option>
        ))}
      </select>
    </label>
  )

  return (
    <form onSubmit={submit} className="stack" aria-label={editingId ? 'Edit template' : 'New template'}>
      <div className="form-grid">
        <label className="wide">
          Template name
          <input data-autofocus value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        </label>
        <label>
          Length by
          <select
            value={draft.limitType}
            onChange={(e) => setDraft({ ...draft, limitType: e.target.value as Draft['limitType'] })}
          >
            <option value="songs">Number of songs</option>
            <option value="minutes">Minutes of music</option>
          </select>
        </label>
        <label>
          {draft.limitType === 'songs' ? 'Songs' : 'Minutes'}
          <input
            inputMode="numeric"
            value={draft.limitValue}
            onChange={(e) => setDraft({ ...draft, limitValue: e.target.value })}
          />
        </label>
        <label className="wide">
          Tempo plan
          <select value={draft.variety} onChange={(e) => setDraft({ ...draft, variety: e.target.value as Variety })}>
            {(Object.keys(VARIETY_LABELS) as Variety[]).map((v) => (
              <option key={v} value={v}>
                {VARIETY_LABELS[v]}
              </option>
            ))}
          </select>
        </label>
        {TEMPOS.map((t) => (
          <label key={t}>
            {t[0].toUpperCase() + t.slice(1)} share
            <input
              inputMode="numeric"
              disabled={draft.variety === 'any'}
              value={draft.mix[t]}
              onChange={(e) => setDraft({ ...draft, mix: { ...draft.mix, [t]: e.target.value } })}
            />
          </label>
        ))}
        {tempoSelect('First song tempo', draft.opener, 'opener')}
        {tempoSelect('Last song tempo', draft.closer, 'closer')}
      </div>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <div className="modal-actions">
        <button type="submit" className="primary">
          {editingId ? 'Save template' : 'Add template'}
        </button>
        <button type="button" className="ghost" onClick={onClose}>
          Cancel
        </button>
      </div>
    </form>
  )
}

export function TemplatesView({ builtIn, custom, onChange }: Props) {
  const [modal, setModal] = useState<{ initial: Draft; editingId: string | null } | null>(null)

  function save(next: Template) {
    onChange(custom.some((t) => t.id === next.id) ? custom.map((t) => (t.id === next.id ? next : t)) : [...custom, next])
  }

  const row = (t: Template, isBuiltIn: boolean) => (
    <li key={t.id} className="row">
      <div className="row-main">
        <div className="row-title">
          <strong>{t.name}</strong>
        </div>
        <div className="row-meta">{describeTemplate(t)}</div>
      </div>
      <div className="row-actions">
        {isBuiltIn ? (
          <button
            type="button"
            className="small"
            onClick={() => setModal({ initial: { ...toDraft(t), name: `${t.name} (copy)` }, editingId: null })}
          >
            Customize <span className="sr-only">{t.name}</span>
          </button>
        ) : (
          <>
            <button type="button" className="small" onClick={() => setModal({ initial: toDraft(t), editingId: t.id })}>
              Edit <span className="sr-only">{t.name}</span>
            </button>
            <button
              type="button"
              className="small danger"
              onClick={() => {
                if (window.confirm(`Delete the template ${t.name}?`)) onChange(custom.filter((x) => x.id !== t.id))
              }}
            >
              Delete <span className="sr-only">{t.name}</span>
            </button>
          </>
        )}
      </div>
    </li>
  )

  return (
    <section aria-labelledby="templates-heading">
      <div className="page-head">
        <h2 id="templates-heading">Templates</h2>
        <button type="button" className="primary with-icon" onClick={() => setModal({ initial: EMPTY, editingId: null })}>
          <PlusIcon />
          New template
        </button>
      </div>
      <p className="muted">
        A template describes a kind of set: how long it is and its balance of slow, medium and high tempo songs. The mix
        is a ratio (for example 1 : 3 : 4), and the tempo plan sets how closely a set has to follow it. Generate a set
        list from a template on the Set Lists tab.
      </p>

      <h3 className="section-title">Built-in</h3>
      <ul className="list" aria-label="Built-in templates">
        {builtIn.map((t) => row(t, true))}
      </ul>

      <h3 className="section-title">Your templates</h3>
      {custom.length === 0 ? (
        <p className="muted">None yet. Create one, or customize a built-in one.</p>
      ) : (
        <ul className="list" aria-label="Your templates">
          {custom.map((t) => row(t, false))}
        </ul>
      )}

      {modal && (
        <Modal title={modal.editingId ? 'Edit template' : 'New template'} onClose={() => setModal(null)}>
          <TemplateForm
            initial={modal.initial}
            editingId={modal.editingId}
            onSave={save}
            onClose={() => setModal(null)}
          />
        </Modal>
      )}
    </section>
  )
}
