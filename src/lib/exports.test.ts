import JSZip from 'jszip'
import { PDFDocument } from 'pdf-lib'
import { describe, expect, it } from 'vitest'
import { buildDocx } from './docxExport'
import { buildPdf } from './pdfExport'
import { paginate } from './pdfLayout'
import { DEFAULT_SHEET, fileStem, sheetModel, type SheetModel } from './sheet'
import type { SetList } from './setlist'
import { makeSong } from './testUtils'

const songs = [
  makeSong('a', 266, { title: 'Superstition', artist: 'Stevie Wonder', key: 'Ebm', tempo: 'high' }),
  makeSong('b', 265, { title: 'I Shot the Sheriff', artist: 'Bob Marley', key: 'F#m', capo: 2 }),
  makeSong('c', 100, { title: "The Times They Are A-Changin'", artist: 'Bob Dylan' }),
]
const set: SetList = { id: 's', name: 'Friday Night Gig', date: '2026-10-23', venue: 'The Pub', songIds: ['a', 'b', 'c'] }

const bytes = async (blob: Blob) => new Uint8Array(await blob.arrayBuffer())

describe('sheetModel', () => {
  it('resolves title, subtitle, items and total from the options', () => {
    const model = sheetModel(set, songs, { ...DEFAULT_SHEET, showKey: true, showDuration: true })
    expect(model.title).toBe('Friday Night Gig')
    expect(model.subtitle).toBe('2026-10-23 · The Pub')
    expect(model.total).toBe('3 songs · 10:31')
    expect(model.items[1]).toEqual({ title: 'I Shot the Sheriff', artist: 'Bob Marley', extras: 'Key F#m · Capo 2 (Em) · 4:25' })
  })
  it('hides artists and total by default settings off', () => {
    const model = sheetModel(set, songs, { ...DEFAULT_SHEET, showArtist: false })
    expect(model.total).toBe('')
    expect(model.items.every((i) => i.artist === '')).toBe(true)
  })
})

describe('fileStem', () => {
  it('makes a safe file name', () => {
    expect(fileStem('Friday Night Gig!')).toBe('friday-night-gig')
    expect(fileStem('???')).toBe('set-list')
  })
})

describe('paginate', () => {
  const items = Array.from({ length: 8 }, (_, i) => ({ item: i + 1, height: 50 }))
  it('balances a short list across two columns on one page', () => {
    const pages = paginate(items, 1000, 2)
    expect(pages).toHaveLength(1)
    expect(pages[0]).toEqual([
      [1, 2, 3, 4],
      [5, 6, 7, 8],
    ])
  })
  it('starts a new page when both columns are full, keeping order', () => {
    const pages = paginate(items, 100, 2) // 2 items per column, 4 per page
    expect(pages.map((p) => p.flat())).toEqual([
      [1, 2, 3, 4],
      [5, 6, 7, 8],
    ])
    expect(pages[0]).toEqual([
      [1, 2],
      [3, 4],
    ])
  })
  it('puts everything in one column when asked for one column', () => {
    expect(paginate(items, 1000, 1)[0]).toEqual([[1, 2, 3, 4, 5, 6, 7, 8]])
  })
  it('handles an empty list and an item taller than the page', () => {
    expect(paginate([], 100, 2)).toEqual([])
    expect(paginate([{ item: 1, height: 500 }], 100, 2).flat(2)).toEqual([1])
  })
})

describe('buildPdf', () => {
  const model = sheetModel(set, songs, DEFAULT_SHEET)
  it('creates a one page PDF for a short set', async () => {
    const out = await bytes(await buildPdf(model))
    expect(new TextDecoder().decode(out.slice(0, 5))).toBe('%PDF-')
    expect((await PDFDocument.load(out)).getPageCount()).toBe(1)
  })
  it('spreads a long set over several pages and in large text', async () => {
    const long: SheetModel = {
      ...model,
      items: Array.from({ length: 120 }, (_, i) => ({ title: `Song number ${i + 1}`, artist: 'Some Artist', extras: '' })),
    }
    expect((await PDFDocument.load(await bytes(await buildPdf(long)))).getPageCount()).toBeGreaterThan(1)
    expect((await PDFDocument.load(await bytes(await buildPdf({ ...model, large: true })))).getPageCount()).toBe(1)
  })
  it('does not fail on characters the standard fonts cannot draw, or on an empty set', async () => {
    const odd: SheetModel = { ...model, title: 'Café 日本', items: [{ title: 'Beyoncé — 日本語', artist: 'Ünï', extras: '' }] }
    expect((await PDFDocument.load(await bytes(await buildPdf(odd)))).getPageCount()).toBe(1)
    expect((await PDFDocument.load(await bytes(await buildPdf({ ...model, items: [] })))).getPageCount()).toBe(1)
  })
})

describe('buildDocx', () => {
  it('creates a Word file with the title, songs and a two column table', async () => {
    const zip = await JSZip.loadAsync(await bytes(await buildDocx(sheetModel(set, songs, DEFAULT_SHEET))))
    const xml = await zip.file('word/document.xml')!.async('string')
    for (const text of ['Friday Night Gig', 'The Pub', 'Superstition', 'Stevie Wonder', 'The Times They Are A-Changin']) {
      expect(xml).toContain(text)
    }
    expect(xml).toContain('Arial')
    expect(xml).toContain('w:numId')
    expect(xml.match(/<w:tc>/g)).toHaveLength(2)
    // songs are split across the two cells in order: 2 in the first, 1 in the second
    const cells = xml.split('<w:tc>').slice(1)
    expect(cells[0]).toContain('Superstition')
    expect(cells[0]).toContain('I Shot the Sheriff')
    expect(cells[1]).toContain('Changin')
  })
  it('uses a single column in large text mode, and copes with an empty set', async () => {
    const zip = await JSZip.loadAsync(await bytes(await buildDocx(sheetModel(set, songs, { ...DEFAULT_SHEET, large: true }))))
    expect((await zip.file('word/document.xml')!.async('string')).match(/<w:tc>/g)).toHaveLength(1)
    const empty = await JSZip.loadAsync(await bytes(await buildDocx({ ...sheetModel(set, songs, DEFAULT_SHEET), items: [] })))
    expect(empty.file('word/document.xml')).not.toBeNull()
  })
})
