import { normalizeSetList, normalizeSong, type SetList, type Song } from './setlist'
import { normalizeTemplate, type Template } from './templates'

export interface BackupData {
  songs: Song[]
  setLists: SetList[]
  templates: Template[]
}

const APP_ID = 'set-list-manager'

export function serializeBackup(data: BackupData, now: Date = new Date()): string {
  return JSON.stringify({ app: APP_ID, version: 2, exportedAt: now.toISOString(), ...data }, null, 2)
}

/** Parses a backup file. Throws an Error with a user-friendly message when it is not valid. */
export function parseBackup(text: string): BackupData {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new Error('That file is not valid JSON.')
  }
  if (typeof raw !== 'object' || raw === null || (raw as { app?: unknown }).app !== APP_ID) {
    throw new Error('That file is not a Set List Manager backup.')
  }
  const r = raw as Record<string, unknown>
  const list = (v: unknown) => (Array.isArray(v) ? v : [])
  const songs = list(r.songs).flatMap((x) => normalizeSong(x) ?? [])
  const songIds = new Set(songs.map((s) => s.id))
  const setLists = list(r.setLists).flatMap((x) => {
    const set = normalizeSetList(x)
    return set ? [{ ...set, songIds: set.songIds.filter((id) => songIds.has(id)) }] : []
  })
  const templates = list(r.templates).flatMap((x) => normalizeTemplate(x) ?? [])
  return { songs, setLists, templates }
}

export function backupFileName(now: Date = new Date()): string {
  return `set-list-manager-backup-${now.toISOString().slice(0, 10)}.json`
}
