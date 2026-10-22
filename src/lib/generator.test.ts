import { describe, expect, it } from 'vitest'
import { allocate, generateSet, planTempos } from './generator'
import { makeSong } from './testUtils'
import type { SetList, Song, Tempo } from './setlist'
import { BUILT_IN_TEMPLATES, type Template } from './templates'

const openMic = BUILT_IN_TEMPLATES.find((t) => t.id === 'open-mic-opener')!
const fullShow = BUILT_IN_TEMPLATES.find((t) => t.id === 'full-show')!

function library(count = 60): Song[] {
  const tempos: Tempo[] = ['slow', 'medium', 'high']
  return Array.from({ length: count }, (_, i) =>
    makeSong(`song${i}`, 150 + (i % 5) * 30, { tempo: tempos[i % 3], artist: `Artist ${i % 10}` }),
  )
}

describe('allocate', () => {
  it('splits a total by weight and always sums to the total', () => {
    expect(allocate(4, { slow: 1, medium: 2, high: 1 })).toEqual({ slow: 1, medium: 2, high: 1 })
    const odd = allocate(7, { slow: 1, medium: 1, high: 1 })
    expect(odd.slow + odd.medium + odd.high).toBe(7)
  })
})

describe('planTempos', () => {
  it('uses the chosen opener and closer and avoids back-to-back repeats', () => {
    const plan = planTempos(10, fullShow)
    expect(plan).toHaveLength(10)
    expect(plan[0]).toBe('medium')
    expect(plan[9]).toBe('high')
    for (let i = 1; i < plan.length; i++) expect(plan[i]).not.toBe(plan[i - 1])
  })
  it('plans a single slot', () => {
    expect(planTempos(1, openMic)).toEqual(['medium'])
    expect(planTempos(0, openMic)).toEqual([])
  })
})

describe('generateSet', () => {
  const songs = library()

  it('open mic opener gives exactly 4 unique songs ending on a high-tempo song', () => {
    const result = generateSet(openMic, songs, [], { seed: 1, today: '2026-06-01' })
    expect(result.songIds).toHaveLength(4)
    expect(new Set(result.songIds).size).toBe(4)
    const byId = new Map(songs.map((s) => [s.id, s]))
    expect(byId.get(result.songIds[0])!.tempo).toBe('medium')
    expect(byId.get(result.songIds[3])!.tempo).toBe('high')
  })

  it('is deterministic for the same seed and different for another', () => {
    const a = generateSet(fullShow, songs, [], { seed: 7, today: '2026-06-01' })
    const b = generateSet(fullShow, songs, [], { seed: 7, today: '2026-06-01' })
    const c = generateSet(fullShow, songs, [], { seed: 8, today: '2026-06-01' })
    expect(a).toEqual(b)
    expect(c.songIds).not.toEqual(a.songIds)
  })

  it('lands close to a time target', () => {
    const result = generateSet(fullShow, songs, [], { seed: 3, today: '2026-06-01' })
    expect(Math.abs(result.totalSec - fullShow.limitValue * 60)).toBeLessThan(150)
  })

  it('uses every song when the library cannot reach the time target', () => {
    const small = library(10)
    const result = generateSet(fullShow, small, [], { seed: 3 })
    expect(result.songIds).toHaveLength(10)
    expect(result.totalSec).toBeLessThan(fullShow.limitValue * 60)
  })

  it('never repeats a song and handles a library smaller than the request', () => {
    const tiny = library(3)
    const result = generateSet(openMic, tiny, [], { seed: 1 })
    expect(result.songIds).toHaveLength(3)
    expect(new Set(result.songIds).size).toBe(3)
  })

  it('returns an empty set for an empty library', () => {
    expect(generateSet(openMic, [], []).songIds).toEqual([])
  })

  it('prefers songs not played recently', () => {
    const pool = [
      makeSong('fresh1', 200, { tempo: 'medium' }),
      makeSong('fresh2', 200, { tempo: 'medium' }),
      makeSong('stale', 200, { tempo: 'medium' }),
    ]
    const history: SetList[] = [
      { id: 'h', name: 'Last week', date: '2026-05-28', venue: '', songIds: ['fresh1', 'fresh2'] },
    ]
    const single: Template = { ...openMic, limitValue: 1, opener: 'medium', closer: null }
    for (let seed = 0; seed < 20; seed++) {
      const result = generateSet(single, pool, history, { seed, today: '2026-06-01' })
      expect(result.songIds).toEqual(['stale'])
    }
  })

  it('falls back to other tempos when a tempo has no songs', () => {
    const allSlow = library(8).map((s) => ({ ...s, tempo: 'slow' as const }))
    const result = generateSet(openMic, allSlow, [], { seed: 2 })
    expect(result.songIds).toHaveLength(4)
  })
})
