import { useState, type ChangeEvent } from 'react'
import { backupFile, canShareFile, parseBackup, type BackupData } from './lib/backup'
import { shareFile } from './lib/deliver'
import { DEFAULT_SETTINGS } from './lib/settings'

interface Props {
  data: BackupData
  onRestore: (data: BackupData) => void
}

export function BackupView({ data, onRestore }: Props) {
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const [shareable] = useState(() => canShareFile(backupFile({ songs: [], setLists: [], templates: [], settings: DEFAULT_SETTINGS })))

  async function share() {
    setError('')
    try {
      await shareFile(backupFile(data))
      setMessage('Backup shared. If you chose Save to Files, it is in the folder you picked.')
    } catch (err) {
      // Closing the share sheet without choosing anything is not an error.
      if (err instanceof DOMException && err.name === 'AbortError') return setMessage('')
      setMessage('')
      setError('Sharing did not work here. Use Download backup instead.')
    }
  }

  function download() {
    const file = backupFile(data)
    const url = URL.createObjectURL(file)
    const a = document.createElement('a')
    a.href = url
    a.download = file.name
    a.click()
    URL.revokeObjectURL(url)
    setError('')
    setMessage('Backup downloaded.')
  }

  async function restore(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const parsed = parseBackup(await file.text())
      const ok = window.confirm(
        `Replace everything in this app with the backup (${parsed.songs.length} songs, ${parsed.setLists.length} set lists, ${parsed.templates.length} templates)?`,
      )
      if (!ok) return
      onRestore(parsed)
      setError('')
      setMessage('Backup restored.')
    } catch (err) {
      setMessage('')
      setError(err instanceof Error ? err.message : 'Could not read that file.')
    }
  }

  return (
    <section aria-labelledby="backup-heading">
      <h2 id="backup-heading">Backup</h2>
      <p className="muted">
        Your songs, set lists and templates live only on this device. Save a backup file now and then (on iPhone, tap
        Share backup and choose Save to Files), and use it to move your data to another device or restore it. The
        home-screen app has its own storage, so restore a backup there after installing it.
      </p>
      <div className="card actions">
        {shareable && (
          <button type="button" className="primary" onClick={share}>
            Share backup (Save to Files, AirDrop…)
          </button>
        )}
        <button type="button" onClick={download}>
          Download backup
        </button>
        <label className="file-button">
          Restore from backup
          <input type="file" accept="application/json,.json" onChange={restore} />
        </label>
      </div>
      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </section>
  )
}
