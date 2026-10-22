export type Tempo = 'slow' | 'medium' | 'high'

export const TEMPOS: Tempo[] = ['slow', 'medium', 'high']

export interface Song {
  id: string
  title: string
  artist: string
  /** Sounding key (what the audience hears), e.g. "F#m". */
  key: string
  /** Capo fret, 0 for none. Shapes are worked out from key and capo. */
  capo: number
  tempo: Tempo | null
  durationSec: number
  /** Capo, tuning, lyrics link, which version you play, etc. */
  notes: string
  /** True for values that were drafted from public data and not yet confirmed. */
  needsReview: boolean
}

export interface SetList {
  id: string
  name: string
  date: string
  venue: string
  songIds: string[]
  /** Template this set was generated from, if any (enables "Regenerate"). */
  templateId?: string
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

/** Music time plus `gapSec` between each pair of songs (no gap after the last one). */
export function totalDuration(set: SetList, songs: Song[], gapSec = 0): number {
  const inSet = setListSongs(set, songs)
  return inSet.reduce((sum, s) => sum + s.durationSec, 0) + Math.max(0, inSet.length - 1) * gapSec
}

export function newId(): string {
  return crypto.randomUUID()
}

export function isTempo(value: unknown): value is Tempo {
  return value === 'slow' || value === 'medium' || value === 'high'
}

/** Coerces stored or imported data into a valid Song (drops legacy fields such as bpm). */
export function normalizeSong(raw: unknown): Song | null {
  if (typeof raw !== 'object' || raw === null) return null
  const r = raw as Record<string, unknown>
  const title = typeof r.title === 'string' ? r.title.trim() : ''
  const durationSec = typeof r.durationSec === 'number' ? Math.round(r.durationSec) : 0
  if (!title || durationSec <= 0) return null
  return {
    id: typeof r.id === 'string' && r.id ? r.id : newId(),
    title,
    artist: typeof r.artist === 'string' ? r.artist.trim() : '',
    key: typeof r.key === 'string' ? r.key.trim() : '',
    capo: typeof r.capo === 'number' && Number.isInteger(r.capo) && r.capo >= 0 && r.capo <= 11 ? r.capo : 0,
    tempo: isTempo(r.tempo) ? r.tempo : null,
    durationSec,
    notes: typeof r.notes === 'string' ? r.notes.trim() : '',
    needsReview: r.needsReview === true,
  }
}

export function normalizeSetList(raw: unknown): SetList | null {
  if (typeof raw !== 'object' || raw === null) return null
  const r = raw as Record<string, unknown>
  const name = typeof r.name === 'string' ? r.name.trim() : ''
  if (!name) return null
  return {
    id: typeof r.id === 'string' && r.id ? r.id : newId(),
    name,
    date: typeof r.date === 'string' ? r.date : '',
    venue: typeof r.venue === 'string' ? r.venue : '',
    songIds: Array.isArray(r.songIds) ? r.songIds.filter((x): x is string => typeof x === 'string') : [],
    ...(typeof r.templateId === 'string' ? { templateId: r.templateId } : {}),
  }
}

/** Most recent date (YYYY-MM-DD) a song appeared in a dated set list, or null if never. */
export function lastPlayed(songId: string, setLists: SetList[]): string | null {
  let latest: string | null = null
  for (const set of setLists) {
    if (set.date && set.songIds.includes(songId) && (latest === null || set.date > latest)) {
      latest = set.date
    }
  }
  return latest
}

export function compareSongs(a: Song, b: Song): number {
  return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })
}

export function songKeyOf(song: Pick<Song, 'title' | 'artist'>): string {
  return `${song.title}|${song.artist}`.toLowerCase().replace(/[^a-z0-9|]/g, '')
}
