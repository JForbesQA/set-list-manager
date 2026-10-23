import { describe, expect, it } from 'vitest'
import { addedSeconds, timeBarModel, timeLeftText } from './timebar'

const target = 30 * 60

describe('timeBarModel', () => {
  it('reports under, within and over relative to the 29:15 to 31:30 window', () => {
    expect(timeBarModel(20 * 60, target).status).toBe('under')
    expect(timeBarModel(29 * 60 + 20, target).status).toBe('within')
    expect(timeBarModel(31 * 60 + 20, target).status).toBe('within')
    expect(timeBarModel(34 * 60, target).status).toBe('over')
  })
  it('keeps everything inside the bar and puts the window around the target', () => {
    const m = timeBarModel(30 * 60 + 2, target)
    for (const v of [m.fillPct, m.windowStartPct, m.windowEndPct]) {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(100)
    }
    expect(m.windowStartPct).toBeLessThan(m.fillPct)
    expect(m.windowEndPct).toBeGreaterThan(m.fillPct)
  })
  it('copes with an empty set and a huge overshoot', () => {
    expect(timeBarModel(0, target).fillPct).toBe(0)
    expect(timeBarModel(10 * target, target).fillPct).toBeLessThanOrEqual(100)
  })
})

describe('timeLeftText', () => {
  it('says on target inside the window, otherwise how much is left or over', () => {
    expect(timeLeftText(30 * 60, target)).toBe('on target')
    expect(timeLeftText(25 * 60, target)).toBe('5:00 left to fill')
    expect(timeLeftText(34 * 60, target)).toBe('4:00 over')
  })
})

describe('addedSeconds', () => {
  const song = (d: number) => ({ durationSec: d })
  it('adds songs, with a gap before each one that follows another song', () => {
    expect(addedSeconds(3, [song(200), song(100)], 30)).toBe(360) // 300 + 2 gaps
    expect(addedSeconds(0, [song(200), song(100)], 30)).toBe(330) // 300 + 1 gap (first song starts the set)
    expect(addedSeconds(2, [], 30)).toBe(0)
    expect(addedSeconds(2, [song(100)])).toBe(100)
  })
})
