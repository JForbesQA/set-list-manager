import { describe, expect, it } from 'vitest'
import { BUILT_IN_TEMPLATES, describeTemplate, normalizeTemplate } from './templates'

describe('built-in templates', () => {
  it('includes the 30-minute short set and the 4-hour full show', () => {
    const byId = new Map(BUILT_IN_TEMPLATES.map((t) => [t.id, t]))
    expect(byId.get('short-set-30')).toMatchObject({ name: 'Short set (30 min)', limitType: 'minutes', limitValue: 30 })
    expect(byId.get('full-show-4h')).toMatchObject({ name: 'Full show (4-hour slot)', limitType: 'minutes' })
    expect(byId.get('full-show-4h')!.limitValue).toBeGreaterThan(byId.get('full-show')!.limitValue)
  })
  it('has unique ids, the open mic opener counts songs, and every mix favours high then medium', () => {
    expect(new Set(BUILT_IN_TEMPLATES.map((t) => t.id)).size).toBe(BUILT_IN_TEMPLATES.length)
    expect(BUILT_IN_TEMPLATES.find((t) => t.id === 'open-mic-opener')).toMatchObject({ limitType: 'songs', limitValue: 4 })
    for (const t of BUILT_IN_TEMPLATES) {
      expect(t.mix.high).toBeGreaterThan(t.mix.medium)
      expect(t.mix.medium).toBeGreaterThan(t.mix.slow)
    }
  })
})

describe('normalizeTemplate', () => {
  const base = { name: 'Mine', limitType: 'songs', limitValue: 5, mix: { slow: 1, medium: 1, high: 1 } }
  it('defaults the tempo plan to loose for templates saved before it existed', () => {
    expect(normalizeTemplate(base)?.variety).toBe('loose')
  })
  it('keeps strict and any, and ignores junk', () => {
    expect(normalizeTemplate({ ...base, variety: 'strict' })?.variety).toBe('strict')
    expect(normalizeTemplate({ ...base, variety: 'any' })?.variety).toBe('any')
    expect(normalizeTemplate({ ...base, variety: 'weird' })?.variety).toBe('loose')
  })
})

describe('describeTemplate', () => {
  it('describes each plan', () => {
    const t = BUILT_IN_TEMPLATES[0]
    expect(describeTemplate(t)).toContain('4 songs')
    expect(describeTemplate({ ...t, variety: 'any' })).toBe('4 songs · any tempo')
    expect(describeTemplate({ ...t, variety: 'strict' })).toContain('exact mix')
  })
})
