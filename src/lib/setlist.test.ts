import { describe, expect, it } from 'vitest'
import {
  formatDuration,
  moveItem,
  parseDuration,
  setListSongs,
  totalDuration,
  type SetList,
  type Song,
} from './setlist'

const song = (id: string, durationSec: number): Song => ({
  id,
  title: id,
  artist: 'Artist',
  key: 'C',
  bpm: 120,
  durationSec,
})

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
  const songs = [song('a', 100), song('b', 200)]
  const set: SetList = { id: 's', name: 'Gig', date: '', venue: '', songIds: ['b', 'missing', 'a'] }

  it('keeps set order and skips missing songs', () => {
    expect(setListSongs(set, songs).map((s) => s.id)).toEqual(['b', 'a'])
  })
  it('totals duration', () => {
    expect(totalDuration(set, songs)).toBe(300)
  })
})
