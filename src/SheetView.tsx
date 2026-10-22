import { useState } from 'react'
import { useLocalStorage } from './lib/useLocalStorage'
import {
  DEFAULT_SHEET,
  normalizeSheetOptions,
  setListText,
  fileStem,
  sheetModel,
  sheetSubtitle,
  songExtras,
  type SheetOptions,
} from './lib/sheet'
import { formatDuration, setListSongs, totalDuration, type SetList, type Song } from './lib/setlist'
import { shareOrDownload } from './lib/deliver'

interface Props {
  set: SetList
  songs: Song[]
  onClose: () => void
}

const TOGGLES: [keyof SheetOptions, string][] = [
  ['showArtist', 'Artist'],
  ['showKey', 'Key & capo'],
  ['showTempo', 'Tempo'],
  ['showDuration', 'Song times & total'],
  ['showNotes', 'Notes'],
  ['large', 'Large text (stage)'],
]

export function SheetView({ set, songs, onClose }: Props) {
  const [options, setOptions] = useLocalStorage<SheetOptions>('slm.sheet', DEFAULT_SHEET, normalizeSheetOptions)
  const [message, setMessage] = useState('')
  const inSet = setListSongs(set, songs)
  const subtitle = sheetSubtitle(set)
  const text = () => setListText(set, songs, options)
  const canShareText = typeof navigator.share === 'function'
  const [busy, setBusy] = useState(false)
  // Installed iPhone web apps (home screen) ignore window.print(), so don't offer a button that does nothing.
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true

  async function saveFile(kind: 'pdf' | 'docx') {
    setBusy(true)
    setMessage('')
    try {
      const model = sheetModel(set, songs, options)
      let blob: Blob
      if (kind === 'pdf') {
        blob = await (await import('./lib/pdfExport')).buildPdf(model)
      } else {
        blob = await (await import('./lib/docxExport')).buildDocx(model)
      }
      const type = kind === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      const file = new File([blob], `${fileStem(set.name)}.${kind}`, { type })
      const result = await shareOrDownload(file)
      if (result === 'shared') setMessage('Shared. Choose Save to Files to keep a copy.')
      if (result === 'downloaded') setMessage('File downloaded.')
    } catch {
      setMessage('Could not create the file here. Try Share text or Copy text.')
    } finally {
      setBusy(false)
    }
  }

  async function share() {
    try {
      await navigator.share({ title: set.name, text: text() })
      setMessage('')
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) setMessage('Sharing did not work here. Use Copy text instead.')
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text())
      setMessage('Copied. Paste it into a message or email.')
    } catch {
      setMessage('Could not copy automatically on this device.')
    }
  }

  return (
    <section aria-label="Set list sheet" className="sheet-page">
      <div className="no-print sheet-controls card">
        <div className="actions">
          <button type="button" onClick={onClose}>
            Back to set lists
          </button>
          <button type="button" disabled={busy} onClick={() => saveFile('pdf')}>
            Save as PDF
          </button>
          <button type="button" disabled={busy} onClick={() => saveFile('docx')}>
            Save as Word (.docx)
          </button>
          {!iosStandalone && (
            <button type="button" onClick={() => window.print()}>
              Print
            </button>
          )}
          {canShareText && (
            <button type="button" onClick={share}>
              Share text
            </button>
          )}
          <button type="button" onClick={copy}>
            Copy text
          </button>
        </div>
        <fieldset className="sheet-options">
          <legend>Show on the sheet</legend>
          {TOGGLES.map(([key, label]) => (
            <label key={key} className="check">
              <input
                type="checkbox"
                checked={options[key]}
                onChange={(e) => setOptions({ ...options, [key]: e.target.checked })}
              />
              {label}
            </label>
          ))}
        </fieldset>
        {message && (
          <p role="status" className="notice">
            {message}
          </p>
        )}
      </div>

      <article className={`sheet${options.large ? ' sheet-large' : ''}`} aria-label={`${set.name} set list`}>
        <h2 className="sheet-title">{set.name}</h2>
        {subtitle && <p className="sheet-subtitle">{subtitle}</p>}
        {inSet.length === 0 ? (
          <p className="muted">This set list is empty.</p>
        ) : (
          <ol className="sheet-list">
            {inSet.map((s) => {
              const extras = songExtras(s, options)
              return (
                <li key={s.id}>
                  <span className="sheet-song">{s.title}</span>
                  {options.showArtist && s.artist && <span className="sheet-artist">{s.artist}</span>}
                  {extras.length > 0 && <span className="sheet-extra">{extras.join(' · ')}</span>}
                </li>
              )
            })}
          </ol>
        )}
        {options.showDuration && inSet.length > 0 && (
          <p className="sheet-total">
            {inSet.length} songs · {formatDuration(totalDuration(set, songs))}
          </p>
        )}
      </article>
    </section>
  )
}
