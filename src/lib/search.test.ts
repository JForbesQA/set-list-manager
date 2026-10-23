import { describe, expect, it } from 'vitest'
import { filterSongs, matchesQuery, NO_FILTER } from './search'
import { makeSong } from './testUtils'

const songs = [
  makeSong('a', 200, { title: "Don't Think Twice", artist: 'Bob Dylan', tempo: 'medium' }),
  makeSong('b', 200, { title: 'Superstition', artist: 'Stevie Wonder', tempo: 'high', needsReview: true }),
  makeSong('c', 200, { title: 'Café Blues', artist: 'The Béatles', tempo: 'slow' }),
  makeSong('d', 200, { title: 'Untagged', artist: 'Nobody', tempo: null }),
]

describe('matchesQuery', () => {
  it('matches title or artist, ignoring case, accents and apostrophes', () => {
    expect(matchesQuery(songs[0], 'dont think')).toBe(true)
    expect(matchesQuery(songs[0], "DON'T")).toBe(true)
    expect(matchesQuery(songs[0], 'dylan')).toBe(true)
    expect(matchesQuery(songs[2], 'cafe beatles')).toBe(true)
  })
  it('needs every word to match, in any order', () => {
    expect(matchesQuery(songs[1], 'wonder super')).toBe(true)
    expect(matchesQuery(songs[1], 'wonder dylan')).toBe(false)
  })
  it('matches everything for an empty search', () => {
    expect(matchesQuery(songs[1], '   ')).toBe(true)
  })
})

describe('filterSongs', () => {
  it('sorts by title when there is no filter', () => {
    expect(filterSongs(songs, NO_FILTER).map((s) => s.id)).toEqual(['c', 'a', 'b', 'd'])
  })
  it('filters by needs review and by tempo, and combines them with search', () => {
    expect(filterSongs(songs, { ...NO_FILTER, reviewOnly: true }).map((s) => s.id)).toEqual(['b'])
    expect(filterSongs(songs, { ...NO_FILTER, tempos: ['slow', 'high'] }).map((s) => s.id)).toEqual(['c', 'b'])
    expect(filterSongs(songs, { query: 'o', reviewOnly: false, tempos: ['medium'] }).map((s) => s.id)).toEqual(['a'])
  })
  it('leaves out untagged songs when a tempo filter is on', () => {
    expect(filterSongs(songs, { ...NO_FILTER, tempos: ['slow', 'medium', 'high'] }).map((s) => s.id)).not.toContain('d')
  })
})
