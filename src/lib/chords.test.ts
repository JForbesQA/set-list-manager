import { describe, expect, it } from 'vitest'
import { capoChanges, describeKey, shapeKey } from './chords'

describe('shapeKey', () => {
  it('works out the shapes for a capo', () => {
    expect(shapeKey('F#m', 2)).toBe('Em') // I Shot the Sheriff
    expect(shapeKey('Gm', 3)).toBe('Em')
    expect(shapeKey('A', 2)).toBe('G')
    expect(shapeKey('E', 4)).toBe('C')
  })
  it('keeps flats for flat keys and wraps around the octave', () => {
    expect(shapeKey('Bb', 1)).toBe('A')
    expect(shapeKey('Ebm', 3)).toBe('Cm')
    expect(shapeKey('C', 2)).toBe('Bb')
    expect(shapeKey('C', 3)).toBe('A')
  })
  it('keeps chord suffixes', () => {
    expect(shapeKey('A7', 2)).toBe('G7')
  })
  it('returns null with no capo or an unreadable key', () => {
    expect(shapeKey('G', 0)).toBeNull()
    expect(shapeKey('', 2)).toBeNull()
    expect(shapeKey('xyz', 2)).toBeNull()
  })
})

describe('describeKey', () => {
  it('shows key, capo and shapes', () => {
    expect(describeKey({ key: 'F#m', capo: 2 })).toBe('Key F#m · Capo 2 (Em)')
  })
  it('handles no capo, no key, and an unreadable key', () => {
    expect(describeKey({ key: 'Am', capo: 0 })).toBe('Key Am')
    expect(describeKey({ key: '', capo: 3 })).toBe('Capo 3')
    expect(describeKey({ key: '', capo: 0 })).toBe('')
    expect(describeKey({ key: 'xyz', capo: 2 })).toBe('Key xyz · Capo 2')
  })
})

describe('capoChanges', () => {
  it('counts every move of the capo, including on and off', () => {
    expect(capoChanges([{ capo: 0 }, { capo: 2 }, { capo: 2 }, { capo: 0 }, { capo: 3 }])).toBe(3)
    expect(capoChanges([{ capo: 2 }])).toBe(0)
  })
})
