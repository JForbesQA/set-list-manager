import { useState } from 'react'
import { AddSongsModal } from './components/AddSongsModal'
import { EnergyStrip } from './components/EnergyStrip'
import { ChevronLeft, PlusIcon, ShareIcon } from './components/icons'
import { Modal } from './components/Modal'
import { SheetPaper } from './components/SheetPaper'
import { TempoChip } from './components/TempoChip'
import { TimeBar } from './components/TimeBar'
import { capoChanges, describeKey } from './lib/chords'
import { shareOrDownload } from './lib/deliver'
import { buildSheetFile, type ExportKind } from './lib/exportFile'
import { DEFAULT_SHEET, normalizeSheetOptions, setListText, sheetModel, type SheetOptions } from './lib/sheet'
import { formatDuration, moveItem, setListSongs, totalDuration, type SetList, type Song } from './lib/setlist'
import type { Template } from './lib/templates'
import { useLocalStorage } from './lib/useLocalStorage'

interface Props {
  set: SetList
  songs: Song[]
  /** The template this set was generated from, if it still exists. */
  template: Template | undefined
  gapSec: number
  notice: string
  onDismissNotice: () => void
  onBack: () => void
  onUpdate: (patch: Partial<SetList>) => void
  onRegenerate: () => void
  onDuplicate: () => void
  onDelete: () => void
}

type Mode = 'sheet' | 'stage' | 'edit'

const MODES: [Mode, string][] = [
  ['sheet', 'Sheet'],
  ['stage', 'Stage'],
  ['edit', 'Edit'],
]

const TOGGLES: [keyof SheetOptions, string][] = [
  ['showArtist', 'Artist'],
  ['showKey', 'Key & capo'],
  ['showTempo', 'Tempo'],
  ['showDuration', 'Song times & total'],
  ['showNotes', 'Notes'],
]

export function SetDetail({
  set,
  songs,
  template,
  gapSec,
  notice,
  onDismissNotice,
  onBack,
  onUpdate,
  onRegenerate,
  onDuplicate,
  onDelete,
}: Props) {
  // A brand new empty set opens straight into editing; anything with songs opens as the printed sheet.
  const [mode, setMode] = useState<Mode>(set.songIds.length === 0 ? 'edit' : 'sheet')
  const [options, setOptions] = useLocalStorage<SheetOptions>('slm.sheet', DEFAULT_SHEET, normalizeSheetOptions)
  const [shareOpen, setShareOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [shareMessage, setShareMessage] = useState('')

  const inSet = setListSongs(set, songs)
  const total = totalDuration(set, songs, gapSec)
  const targetSec = template && template.limitType === 'minutes' ? template.limitValue * 60 : null
  const changes = capoChanges(inSet)
  const model = sheetModel(set, songs, { ...options, large: mode === 'stage' }, gapSec)

  const canShareText = typeof navigator.share === 'function'
  // Installed iPhone web apps (home screen) ignore window.print(), so don't offer a button that does nothing.
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true

  async function saveFile(kind: ExportKind) {
    setBusy(true)
    setShareMessage('')
    try {
      const result = await shareOrDownload(await buildSheetFile(kind, model))
      if (result === 'shared') setShareMessage('Shared. Choose Save to Files to keep a copy.')
      if (result === 'downloaded') setShareMessage('File downloaded.')
    } catch {
      setShareMessage('Could not create the file here. Try Share text or Copy text.')
    } finally {
      setBusy(false)
    }
  }

  async function shareText() {
    try {
      await navigator.share({ title: set.name, text: setListText(set, songs, options, gapSec) })
      setShareMessage('')
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        setShareMessage('Sharing did not work here. Use Copy text instead.')
      }
    }
  }

  async function copyText() {
    try {
      await navigator.clipboard.writeText(setListText(set, songs, options, gapSec))
      setShareMessage('Copied. Paste it into a message or email.')
    } catch {
      setShareMessage('Could not copy automatically on this device.')
    }
  }

  function print() {
    setShareOpen(false)
    // Give the dialog a moment to close so it is not part of the printout.
    setTimeout(() => window.print(), 150)
  }

  return (
    <section aria-label={`${set.name} set list`} className="detail">
      <div className="detail-top no-print">
        <button type="button" className="ghost with-icon" onClick={onBack}>
          <ChevronLeft />
          Back to set lists
        </button>
        <button
          type="button"
          className="with-icon"
          onClick={() => {
            setShareMessage('')
            setShareOpen(true)
          }}
        >
          <ShareIcon />
          Share / export
        </button>
      </div>

      {notice && (
        <p role="status" className="notice no-print">
          {notice}{' '}
          <button type="button" className="ghost small" onClick={onDismissNotice}>
            Dismiss
          </button>
        </p>
      )}

      {mode !== 'stage' && (
        <div className="summary no-print">
          <TimeBar
            totalSec={total}
            songCount={inSet.length}
            targetSec={targetSec}
            note={gapSec > 0 && inSet.length > 1 ? `(includes ${gapSec}s between songs)` : undefined}
          />
          <EnergyStrip tempos={inSet.map((s) => s.tempo)} />
          {inSet.some((s) => s.capo > 0) && <p className="meta">Capo changes: {changes}</p>}
        </div>
      )}

      <div className="segmented no-print" role="group" aria-label="View">
        {MODES.map(([id, label]) => (
          <button key={id} type="button" aria-pressed={mode === id} onClick={() => setMode(id)}>
            {label}
          </button>
        ))}
      </div>

      {mode !== 'edit' ? (
        <>
          {mode === 'sheet' && (
            <details className="fold no-print">
              <summary>
                Show on the sheet:{' '}
                {TOGGLES.filter(([k]) => options[k])
                  .map(([, l]) => l)
                  .join(', ') || 'titles only'}
              </summary>
              <div className="chip-row" role="group" aria-label="Show on the sheet">
                {TOGGLES.map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    className="filter-chip"
                    aria-pressed={options[key]}
                    onClick={() => setOptions({ ...options, [key]: !options[key] })}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </details>
          )}
          <SheetPaper model={model} />
        </>
      ) : (
        <div className="stack no-print">
          <details className="fold boxed">
            <summary>Details: {[set.name, set.date, set.venue].filter(Boolean).join(' · ')}</summary>
            <div className="form-grid">
              <label className="wide">
                Name
                <input value={set.name} onChange={(e) => onUpdate({ name: e.target.value })} />
              </label>
              <label>
                Date
                <input type="date" value={set.date} onChange={(e) => onUpdate({ date: e.target.value })} />
              </label>
              <label>
                Venue
                <input value={set.venue} onChange={(e) => onUpdate({ venue: e.target.value })} />
              </label>
            </div>
          </details>

          <div className="page-head">
            <h3 className="card-title">Songs ({inSet.length})</h3>
            <button type="button" className="primary with-icon" onClick={() => setAddOpen(true)}>
              <PlusIcon />
              Add songs
            </button>
          </div>

          {inSet.length === 0 ? (
            <p className="muted">This set is empty. Tap Add songs to search your library.</p>
          ) : (
            <ol className="list numbered" aria-label={`Songs in ${set.name}`}>
              {inSet.map((s, i) => (
                <li key={s.id} className="row song-row" data-tempo={s.tempo ?? 'none'}>
                  <span className="row-number" aria-hidden="true">
                    {i + 1}
                  </span>
                  <div className="row-main">
                    <div className="row-title">
                      <strong>{s.title}</strong>
                    </div>
                    {s.artist && <div className="row-sub">{s.artist}</div>}
                    <div className="row-meta">
                      <TempoChip tempo={s.tempo} />
                      {describeKey(s) && <span className="chip">{describeKey(s)}</span>}
                      <span>{formatDuration(s.durationSec)}</span>
                    </div>
                  </div>
                  <div className="row-actions">
                    <button
                      type="button"
                      className="small"
                      disabled={i === 0}
                      onClick={() => onUpdate({ songIds: moveItem(set.songIds, i, i - 1) })}
                    >
                      Move up <span className="sr-only">{s.title}</span>
                    </button>
                    <button
                      type="button"
                      className="small"
                      disabled={i === inSet.length - 1}
                      onClick={() => onUpdate({ songIds: moveItem(set.songIds, i, i + 1) })}
                    >
                      Move down <span className="sr-only">{s.title}</span>
                    </button>
                    <button
                      type="button"
                      className="small danger"
                      onClick={() => onUpdate({ songIds: set.songIds.filter((id) => id !== s.id) })}
                    >
                      Remove <span className="sr-only">{s.title}</span>
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          )}

          <div className="actions">
            {template && (
              <button type="button" onClick={onRegenerate}>
                Regenerate from {template.name}
              </button>
            )}
            <button type="button" onClick={onDuplicate}>
              Duplicate set list
            </button>
            <button type="button" className="danger" onClick={onDelete}>
              Delete set list
            </button>
          </div>
        </div>
      )}

      {addOpen && (
        <AddSongsModal
          songs={songs}
          set={set}
          gapSec={gapSec}
          currentTotal={total}
          targetSec={targetSec}
          onAdd={(ids) => onUpdate({ songIds: [...set.songIds, ...ids] })}
          onClose={() => setAddOpen(false)}
        />
      )}

      {shareOpen && (
        <Modal title="Share or export" onClose={() => setShareOpen(false)}>
          <div className="stack">
            <p className="meta">
              {mode === 'stage'
                ? 'Files use the large stage text.'
                : 'Files match the sheet as shown, with the options you chose.'}
            </p>
            <div className="menu">
              <button type="button" disabled={busy} onClick={() => saveFile('pdf')}>
                Save as PDF
              </button>
              <button type="button" disabled={busy} onClick={() => saveFile('docx')}>
                Save as Word (.docx)
              </button>
              {canShareText && (
                <button type="button" onClick={shareText}>
                  Share text
                </button>
              )}
              <button type="button" onClick={copyText}>
                Copy text
              </button>
              {!iosStandalone && (
                <button type="button" onClick={print}>
                  Print
                </button>
              )}
            </div>
            {shareMessage && (
              <p role="status" className="notice">
                {shareMessage}
              </p>
            )}
          </div>
        </Modal>
      )}
    </section>
  )
}
