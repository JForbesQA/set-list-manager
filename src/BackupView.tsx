import { useState, type ChangeEvent } from 'react'
import { backupFileName, parseBackup, serializeBackup, type BackupData } from './lib/backup'

interface Props {
  data: BackupData
  onRestore: (data: BackupData) => void
}

export function BackupView({ data, onRestore }: Props) {
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  function download() {
    const blob = new Blob([serializeBackup(data)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = backupFileName()
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
        Your songs, set lists and templates live only in this browser. Download a backup file now and then, and use it to
        move your data to another device or restore it. Installing the app on your iPhone starts with an empty library
        because the home-screen app has its own storage, so restore a backup there.
      </p>
      <div className="card actions">
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
