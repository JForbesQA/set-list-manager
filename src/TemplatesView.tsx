import { useState, type FormEvent } from 'react'
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

export function TemplatesView({ builtIn, custom, onChange }: Props) {
  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  function reset() {
    setDraft(EMPTY)
    setEditingId(null)
    setError('')
  }

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
    const next: Template = {
      id: editingId ?? newId(),
      name: draft.name.trim(),
      limitType: draft.limitType,
      limitValue,
      mix,
      opener: isTempo(draft.opener) ? draft.opener : null,
      closer: isTempo(draft.closer) ? draft.closer : null,
      variety: draft.variety,
    }
    onChange(editingId ? custom.map((t) => (t.id === editingId ? next : t)) : [...custom, next])
    reset()
  }

  function startEdit(t: Template, copy: boolean) {
    setDraft({ ...toDraft(t), name: copy ? `${t.name} (copy)` : t.name })
    setEditingId(copy ? null : t.id)
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const row = (t: Template, isBuiltIn: boolean) => (
    <li key={t.id} className="row">
      <div>
        <strong>{t.name}</strong>
        <div className="meta">{describeTemplate(t)}</div>
      </div>
      <div className="actions">
        {isBuiltIn ? (
          <button type="button" onClick={() => startEdit(t, true)}>
            Customize <span className="sr-only">{t.name}</span>
          </button>
        ) : (
          <>
            <button type="button" onClick={() => startEdit(t, false)}>
              Edit <span className="sr-only">{t.name}</span>
            </button>
            <button type="button" className="danger" onClick={() => onChange(custom.filter((x) => x.id !== t.id))}>
              Delete <span className="sr-only">{t.name}</span>
            </button>
          </>
        )}
      </div>
    </li>
  )

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
    <section aria-labelledby="templates-heading">
      <h2 id="templates-heading">Templates</h2>
      <p className="muted">
        A template describes a kind of set: how long it is and its balance of slow, medium and high tempo songs. The
        mix is a ratio (for example 1 : 3 : 4), and the tempo plan sets how closely a set has to follow it. Generate a
        set list from a template on the Set Lists tab.
      </p>

      <form onSubmit={submit} className="card form-grid" aria-label={editingId ? 'Edit template' : 'New template'}>
        <label>
          Template name
          <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
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
        <div className="actions">
          <button type="submit">{editingId ? 'Save template' : 'Add template'}</button>
          {(editingId || draft.name) && (
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

      <h3>Built-in</h3>
      <ul className="list" aria-label="Built-in templates">
        {builtIn.map((t) => row(t, true))}
      </ul>

      <h3>Your templates</h3>
      {custom.length === 0 ? (
        <p className="muted">None yet. Create one above, or customize a built-in one.</p>
      ) : (
        <ul className="list" aria-label="Your templates">
          {custom.map((t) => row(t, false))}
        </ul>
      )}
    </section>
  )
}
