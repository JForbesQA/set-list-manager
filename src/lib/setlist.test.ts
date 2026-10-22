import { describe, expect, it } from 'vitest'
import {
  formatDuration,
  lastPlayed,
  moveItem,
  normalizeSong,
  parseDuration,
  setListSongs,
  totalDuration,
  type SetList,
} from './setlist'
import { makeSong } from './testUtils'

describe('formatDuration', () => {
  it('formats minutes and seconds', () => {
    expect(formatDuration(225)).toBe('3:45')
    expect(formatDuration(5)).toBe('0:05')
  })
  it('adds hours when needed', () => {
    expect(formatDuration(3725)).toBe('1:02:05')
  })
})

describe('parseDuration', () => {
  it('parses m:ss', () => {
    expect(parseDuration('3:45')).toBe(225)
    expect(parseDuration(' 12:00 ')).toBe(720)
  })
  it('rejects invalid input', () => {
    expect(parseDuration('3')).toBeNull()
    expect(parseDuration('3:75')).toBeNull()
    expect(parseDuration('0:00')).toBeNull()
    expect(parseDuration('abc')).toBeNull()
  })
})

describe('moveItem', () => {
  it('moves an item down and up', () => {
    expect(moveItem(['a', 'b', 'c'], 0, 1)).toEqual(['b', 'a', 'c'])
    expect(moveItem(['a', 'b', 'c'], 2, 1)).toEqual(['a', 'c', 'b'])
  })
  it('ignores out-of-range moves', () => {
    const items = ['a', 'b']
    expect(moveItem(items, 0, -1)).toBe(items)
    expect(moveItem(items, 1, 2)).toBe(items)
  })
})

describe('set list helpers', () => {
  const songs = [makeSong('a', 100), makeSong('b', 200)]
  const set: SetList = { id: 's', name: 'Gig', date: '', venue: '', songIds: ['b', 'missing', 'a'] }

  it('keeps set order and skips missing songs', () => {
    expect(setListSongs(set, songs).map((s) => s.id)).toEqual(['b', 'a'])
  })
  it('totals duration', () => {
    expect(totalDuration(set, songs)).toBe(300)
  })
  it('adds time between songs, but not after the last one', () => {
    expect(totalDuration(set, songs, 30)).toBe(330) // 2 songs found, 1 gap
    expect(totalDuration({ ...set, songIds: [] }, songs, 30)).toBe(0)
    expect(totalDuration({ ...set, songIds: ['a'] }, songs, 30)).toBe(100)
  })
})

describe('normalizeSong', () => {
  it('upgrades a v1 song: drops bpm, adds tempo, notes and review flag', () => {
    const song = normalizeSong({ id: 'x', title: 'Old', artist: 'A', key: 'G', bpm: 120, durationSec: 180 })
    expect(song).toEqual({
      id: 'x',
      title: 'Old',
      artist: 'A',
      key: 'G',
      capo: 0,
      tempo: null,
      durationSec: 180,
      notes: '',
      needsReview: false,
    })
  })
  it('rejects songs without a title or duration', () => {
    expect(normalizeSong({ title: '', durationSec: 100 })).toBeNull()
    expect(normalizeSong({ title: 'x', durationSec: 0 })).toBeNull()
    expect(normalizeSong('nope')).toBeNull()
  })
  it('keeps a valid capo and ignores an invalid one', () => {
    expect(normalizeSong({ title: 'x', durationSec: 60, capo: 2 })?.capo).toBe(2)
    expect(normalizeSong({ title: 'x', durationSec: 60, capo: 15 })?.capo).toBe(0)
    expect(normalizeSong({ title: 'x', durationSec: 60, capo: 'two' })?.capo).toBe(0)
  })
  it('ignores an invalid tempo', () => {
    expect(normalizeSong({ title: 'x', durationSec: 60, tempo: 'fast' })?.tempo).toBeNull()
  })
})

describe('lastPlayed', () => {
  const sets: SetList[] = [
    { id: '1', name: 'Old', date: '2026-01-10', venue: '', songIds: ['a'] },
    { id: '2', name: 'New', date: '2026-03-05', venue: '', songIds: ['a', 'b'] },
    { id: '3', name: 'Undated', date: '', venue: '', songIds: ['c'] },
  ]
  it('returns the most recent date', () => {
    expect(lastPlayed('a', sets)).toBe('2026-03-05')
    expect(lastPlayed('b', sets)).toBe('2026-03-05')
  })
  it('returns null for never played or undated sets', () => {
    expect(lastPlayed('c', sets)).toBeNull()
    expect(lastPlayed('zzz', sets)).toBeNull()
  })
})
