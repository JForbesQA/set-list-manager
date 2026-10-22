import { describe, expect, it } from 'vitest'
import { allocate, generateSet, mulberry32, planTempos, timeWindow } from './generator'
import { makeSong } from './testUtils'
import type { SetList, Song, Tempo } from './setlist'
import { starterSongsMissingFrom } from '../data/starterLibrary'
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
  const strict: Template = { ...fullShow, variety: 'strict' }
  const loose: Template = { ...fullShow, variety: 'loose' }
  const any: Template = { ...fullShow, variety: 'any' }

  it('strict: opener and closer at the ends, exact mix, no back-to-back repeats', () => {
    const plan = planTempos(10, strict)
    expect(plan).toHaveLength(10)
    expect(plan[0]).toBe('medium')
    expect(plan[9]).toBe('high')
    for (let i = 1; i < plan.length; i++) expect(plan[i]).not.toBe(plan[i - 1])
  })

  it('loose: keeps opener and closer but does not enforce exact counts', () => {
    const counts = new Set<string>()
    for (let seed = 0; seed < 50; seed++) {
      const plan = planTempos(12, loose, mulberry32(seed))
      expect(plan[0]).toBe('medium')
      expect(plan[11]).toBe('high')
      counts.add(plan.filter((t) => t === 'slow').length.toString())
      // never three of the same tempo in a row
      for (let i = 2; i < plan.length; i++) {
        expect(plan[i] === plan[i - 1] && plan[i] === plan[i - 2]).toBe(false)
      }
    }
    // an exact plan would give the same number of slow songs every time
    expect(counts.size).toBeGreaterThan(2)
  })

  it('loose: follows the weights on average, so high is the most common', () => {
    const totals = { slow: 0, medium: 0, high: 0 }
    for (let seed = 0; seed < 200; seed++) {
      for (const t of planTempos(10, loose, mulberry32(seed))) if (t) totals[t]++
    }
    expect(totals.high).toBeGreaterThan(totals.medium)
    expect(totals.medium).toBeGreaterThan(totals.slow)
  })

  it('any: no tempo preference, not even for opener and closer', () => {
    expect(planTempos(5, any)).toEqual([null, null, null, null, null])
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

  it('lands inside the time window for a time target', () => {
    const target = fullShow.limitValue * 60
    const { under, over } = timeWindow(target)
    const result = generateSet(fullShow, songs, [], { seed: 3, today: '2026-06-01' })
    expect(result.totalSec).toBeGreaterThanOrEqual(target - under)
    expect(result.totalSec).toBeLessThanOrEqual(target + over)
  })

  it('never stops short by more than the window, and may run a little over, on a real-sized library', () => {
    const real = starterSongsMissingFrom([])
    for (const id of ['short-set-30', 'short-set']) {
      const t = BUILT_IN_TEMPLATES.find((x) => x.id === id)!
      const target = t.limitValue * 60
      const { under, over } = timeWindow(target)
      let ranOver = 0
      for (let seed = 0; seed < 150; seed++) {
        const { totalSec } = generateSet(t, real, [], { seed, today: '2026-10-22' })
        expect(totalSec).toBeGreaterThanOrEqual(target - under)
        expect(totalSec).toBeLessThanOrEqual(target + over)
        if (totalSec > target) ranOver++
      }
      // An extra song beats stopping short, so some sets do run slightly over...
      expect(ranOver).toBeGreaterThan(20)
      // ...but the buffer is small: 30 minutes accepts at most about 2 minutes over.
      expect(over).toBeLessThanOrEqual(target * 0.075)
    }
  })

  it('gives more than one song count for the same time target, so combinations stay varied', () => {
    const real = starterSongsMissingFrom([])
    const t = BUILT_IN_TEMPLATES.find((x) => x.id === 'short-set-30')!
    const counts = new Set<number>()
    for (let seed = 0; seed < 100; seed++) counts.add(generateSet(t, real, [], { seed, today: '2026-10-22' }).songIds.length)
    expect(counts.size).toBeGreaterThanOrEqual(3)
  })

  it('has a tight window below the target and a looser one above it', () => {
    expect(timeWindow(30 * 60)).toEqual({ under: 45, over: 126 })
    expect(timeWindow(45 * 60)).toEqual({ under: 68, over: 189 })
    const big = timeWindow(300 * 60)
    expect(big.over).toBe(240)
    expect(big.under).toBeLessThan(big.over)
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

  it('leans towards songs with the same capo as the previous song', () => {
    const pool = ['a', 'b', 'c', 'd', 'e', 'f'].map((id, i) =>
      makeSong(id, 200, { tempo: 'medium', capo: i < 3 ? 0 : 2, artist: id }),
    )
    const pair: Template = { ...openMic, limitValue: 2, mix: { slow: 0, medium: 1, high: 0 }, opener: null, closer: null }
    const byId = new Map(pool.map((s) => [s.id, s]))
    let sameCapo = 0
    const runs = 300
    for (let seed = 0; seed < runs; seed++) {
      const [first, second] = generateSet(pair, pool, [], { seed, today: '2026-06-01' }).songIds
      if (byId.get(first)!.capo === byId.get(second)!.capo) sameCapo++
    }
    // With no preference only 2 of the 5 remaining songs match (40%).
    expect(sameCapo / runs).toBeGreaterThan(0.5)
  })

  it('anything goes: can mix tempos freely and still never repeats a song', () => {
    const free: Template = { ...fullShow, variety: 'any', limitType: 'songs', limitValue: 20 }
    const byId = new Map(songs.map((s) => [s.id, s]))
    const result = generateSet(free, songs, [], { seed: 5, today: '2026-06-01' })
    expect(new Set(result.songIds).size).toBe(20)
    const tempos = new Set(result.songIds.map((id) => byId.get(id)!.tempo))
    expect(tempos.size).toBe(3)
  })

  it('loose generation is weighted towards high and medium over many runs', () => {
    const byId = new Map(songs.map((s) => [s.id, s]))
    const totals = { slow: 0, medium: 0, high: 0 }
    for (let seed = 0; seed < 100; seed++) {
      const ids = generateSet(openMic, songs, [], { seed, today: '2026-06-01' }).songIds
      for (const id of ids) totals[byId.get(id)!.tempo!]++
    }
    expect(totals.high).toBeGreaterThan(totals.medium)
    expect(totals.medium).toBeGreaterThan(totals.slow)
  })

  it('falls back to other tempos when a tempo has no songs', () => {
    const allSlow = library(8).map((s) => ({ ...s, tempo: 'slow' as const }))
    const result = generateSet(openMic, allSlow, [], { seed: 2 })
    expect(result.songIds).toHaveLength(4)
  })
})
