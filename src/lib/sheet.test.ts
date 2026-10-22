import { describe, expect, it } from 'vitest'
import { DEFAULT_SHEET, normalizeSheetOptions, setListText, songExtras } from './sheet'
import type { SetList } from './setlist'
import { makeSong } from './testUtils'

const songs = [
  makeSong('a', 266, { title: 'Superstition', artist: 'Stevie Wonder', key: 'Ebm', tempo: 'high', notes: 'Intro riff' }),
  makeSong('b', 265, { title: 'I Shot the Sheriff', artist: 'Bob Marley', key: 'F#m', capo: 2, tempo: 'medium' }),
  makeSong('c', 100, { title: 'Solo', artist: '' }),
]
const set: SetList = { id: 's', name: 'Friday Night Gig', date: '2026-10-23', venue: 'The Pub', songIds: ['a', 'b', 'c'] }

describe('setListText', () => {
  it('matches the simple title and artist layout by default', () => {
    expect(setListText(set, songs, DEFAULT_SHEET)).toBe(
      [
        'Friday Night Gig',
        '2026-10-23 · The Pub',
        '',
        '1. Superstition — Stevie Wonder',
        '2. I Shot the Sheriff — Bob Marley',
        '3. Solo',
      ].join('\n'),
    )
  })

  it('adds key and capo, times and a total when chosen', () => {
    const text = setListText(set, songs, { ...DEFAULT_SHEET, showKey: true, showDuration: true })
    expect(text).toContain('1. Superstition — Stevie Wonder (Key Ebm · 4:26)')
    expect(text).toContain('2. I Shot the Sheriff — Bob Marley (Key F#m · Capo 2 (Em) · 4:25)')
    expect(text.trim().endsWith('3 songs · 10:31')).toBe(true)
  })

  it('can hide artists and skips missing songs', () => {
    const text = setListText({ ...set, songIds: ['a', 'ghost'] }, songs, { ...DEFAULT_SHEET, showArtist: false })
    expect(text).toContain('1. Superstition')
    expect(text).not.toContain('Stevie')
    expect(text).not.toContain('2.')
  })

  it('omits the subtitle when there is no date or venue', () => {
    expect(setListText({ ...set, date: '', venue: '' }, songs, DEFAULT_SHEET).split('\n')[1]).toBe('')
  })
})

describe('songExtras', () => {
  it('only includes what is switched on', () => {
    expect(songExtras(songs[0], DEFAULT_SHEET)).toEqual([])
    expect(songExtras(songs[0], { ...DEFAULT_SHEET, showTempo: true, showNotes: true })).toEqual([
      'high tempo',
      'Intro riff',
    ])
  })
})

describe('normalizeSheetOptions', () => {
  it('fills in defaults for missing or invalid values', () => {
    expect(normalizeSheetOptions(null)).toEqual(DEFAULT_SHEET)
    expect(normalizeSheetOptions({ showKey: true, large: 'yes' })).toEqual({ ...DEFAULT_SHEET, showKey: true })
  })
})
