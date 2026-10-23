import { compareSongs, type Song, type Tempo } from './setlist'

/** Lower-case, no accents, no apostrophes, so "dont think" finds "Don't Think Twice" and "cafe" finds "Café". */
function fold(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['’‘`]/g, '')
    .toLowerCase()
}

/** Every word you type has to appear somewhere in the title or artist, in any order. */
export function matchesQuery(song: Pick<Song, 'title' | 'artist'>, query: string): boolean {
  const words = fold(query).split(/\s+/).filter(Boolean)
  if (words.length === 0) return true
  const haystack = fold(`${song.title} ${song.artist}`)
  return words.every((w) => haystack.includes(w))
}

export interface SongFilter {
  query: string
  reviewOnly: boolean
  /** Show only these tempos; empty means all of them. */
  tempos: Tempo[]
}

export const NO_FILTER: SongFilter = { query: '', reviewOnly: false, tempos: [] }

export function filterSongs(songs: Song[], f: SongFilter): Song[] {
  return songs
    .filter((s) => !f.reviewOnly || s.needsReview)
    .filter((s) => f.tempos.length === 0 || (s.tempo !== null && f.tempos.includes(s.tempo)))
    .filter((s) => matchesQuery(s, f.query))
    .sort(compareSongs)
}
