import { describe, expect, it } from 'vitest'
import { parseBackup, serializeBackup } from './backup'
import { starterSongsMissingFrom, STARTER_COUNT } from '../data/starterLibrary'
import { makeSong } from './testUtils'
import { BUILT_IN_TEMPLATES } from './templates'

describe('backup', () => {
  it('round-trips songs, set lists and templates', () => {
    const songs = [makeSong('a'), makeSong('b')]
    const setLists = [{ id: 's', name: 'Gig', date: '2026-06-01', venue: 'Bar', songIds: ['a', 'b'] }]
    const templates = [{ ...BUILT_IN_TEMPLATES[0], id: 'custom', builtIn: undefined, name: 'Mine' }]
    const result = parseBackup(serializeBackup({ songs, setLists, templates }))
    expect(result.songs).toEqual(songs)
    expect(result.setLists).toEqual(setLists)
    expect(result.templates.map((t) => t.name)).toEqual(['Mine'])
  })

  it('drops set list entries that point at missing songs', () => {
    const text = JSON.stringify({
      app: 'set-list-manager',
      songs: [makeSong('a')],
      setLists: [{ id: 's', name: 'Gig', songIds: ['a', 'ghost'] }],
    })
    expect(parseBackup(text).setLists[0].songIds).toEqual(['a'])
  })

  it('rejects files that are not valid backups', () => {
    expect(() => parseBackup('not json')).toThrow(/not valid JSON/)
    expect(() => parseBackup('{"songs":[]}')).toThrow(/not a Set List Manager backup/)
  })
})

describe('starter library', () => {
  it('flags every starter song for review and skips ones already present', () => {
    const all = starterSongsMissingFrom([])
    expect(all).toHaveLength(STARTER_COUNT)
    expect(all.every((s) => s.needsReview && s.durationSec > 0 && s.tempo)).toBe(true)
    const again = starterSongsMissingFrom([{ ...all[0], id: 'mine', title: all[0].title.toUpperCase() }])
    expect(again).toHaveLength(STARTER_COUNT - 1)
  })
})
