export interface Song {
  id: string
  title: string
  artist: string
  key: string
  bpm: number | null
  durationSec: number
}

export interface SetList {
  id: string
  name: string
  date: string
  venue: string
  songIds: string[]
}

export function formatDuration(totalSec: number): string {
  const sec = Math.max(0, Math.round(totalSec))
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`
}

/** Parses "m:ss" (e.g. "3:45") into seconds. Returns null when invalid. */
export function parseDuration(input: string): number | null {
  const match = /^(\d{1,3}):([0-5]\d)$/.exec(input.trim())
  if (!match) return null
  const total = Number(match[1]) * 60 + Number(match[2])
  return total > 0 ? total : null
}

export function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) {
    return items
  }
  const next = items.slice()
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}

export function setListSongs(set: SetList, songs: Song[]): Song[] {
  const byId = new Map(songs.map((s) => [s.id, s]))
  return set.songIds.flatMap((id) => {
    const song = byId.get(id)
    return song ? [song] : []
  })
}

export function totalDuration(set: SetList, songs: Song[]): number {
  return setListSongs(set, songs).reduce((sum, s) => sum + s.durationSec, 0)
}

export function newId(): string {
  return crypto.randomUUID()
}
