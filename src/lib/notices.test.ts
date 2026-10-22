import { describe, expect, it } from 'vitest'
import { generationNotice } from './notices'
import { BUILT_IN_TEMPLATES } from './templates'
import { makeSong } from './testUtils'

const short30 = BUILT_IN_TEMPLATES.find((t) => t.id === 'short-set-30')!
const openMic = BUILT_IN_TEMPLATES.find((t) => t.id === 'open-mic-opener')!
const library = Array.from({ length: 40 }, (_, i) => makeSong(`s${i}`, 200)) // 133 minutes

describe('generationNotice', () => {
  it('says nothing when the set is on target', () => {
    expect(generationNotice(short30, 29 * 60, library)).toBe('')
    expect(generationNotice(openMic, 700, library)).toBe('')
  })
  it('treats a small overshoot as on target, since an extra song beats stopping short', () => {
    expect(generationNotice(short30, 32 * 60, library)).toBe('')
    expect(generationNotice(short30, 29.5 * 60, library)).toBe('')
  })
  it('counts the gaps when judging whether the whole library is too short', () => {
    const four = Array.from({ length: 4 }, (_, i) => makeSong(`t${i}`, 450)) // 30:00 of music
    expect(generationNotice(short30, 30 * 60, four, 0)).toBe('')
    // with 60s between songs the library is 33:00 in total, still enough
    expect(generationNotice(short30, 30 * 60, four, 60)).toBe('')
    const three = Array.from({ length: 3 }, (_, i) => makeSong(`u${i}`, 540)) // 27:00 of music
    expect(generationNotice(short30, 27 * 60, three, 0)).toContain('whole library')
    // the gaps are included in the library total it reports: 27:00 of music + 2 x 30s = 28:00
    expect(generationNotice(short30, 28 * 60, three, 30)).toContain('whole library is only 28:00')
  })
  it('flags a set that ran well over its slot', () => {
    expect(generationNotice(short30, 37 * 60, library)).toContain('Regenerate')
  })
  it('does not blame the library when it has plenty of music but the set missed', () => {
    const text = generationNotice(short30, 20 * 60, library)
    expect(text).toContain('Regenerate')
    expect(text).not.toContain('library')
  })
  it('blames the whole library only when it is really too short', () => {
    const tiny = [makeSong('a', 600), makeSong('b', 600)] // 20 minutes in total
    const text = generationNotice(short30, 20 * 60, tiny)
    expect(text).toContain('Your whole library is only 20:00')
  })
  it('explains a song-count shortfall', () => {
    expect(generationNotice(openMic, 400, [makeSong('a'), makeSong('b')])).toContain('only has 2 songs')
  })
})
