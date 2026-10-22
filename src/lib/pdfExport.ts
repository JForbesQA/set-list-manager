import { PDFDocument, PDFFont, StandardFonts, rgb } from 'pdf-lib'
import { paginate } from './pdfLayout'
import type { SheetItem, SheetModel } from './sheet'

const PAGE_W = 612 // US Letter
const PAGE_H = 792
const MARGIN = 48
const GAP = 30
const INDENT = 24
const GREY = rgb(0.4, 0.4, 0.4)

/** Standard PDF fonts only cover Latin-1 text; swap anything else for "?" rather than failing. */
function safe(text: string, font: PDFFont): string {
  const allowed = new Set(font.getCharacterSet())
  return Array.from(text)
    .map((ch) => (allowed.has(ch.codePointAt(0) ?? 0) ? ch : '?'))
    .join('')
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const lines: string[] = []
  let line = ''
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word
    if (line && font.widthOfTextAtSize(next, size) > maxWidth) {
      lines.push(line)
      line = word
    } else {
      line = next
    }
  }
  if (line) lines.push(line)
  return lines.length > 0 ? lines : ['']
}

interface Block {
  item: SheetItem
  number: number
  title: string[]
  artist: string[]
  extras: string[]
}

/** A PDF version of the sheet: centred title with a rule, then a numbered list in balanced columns. */
export async function buildPdf(model: SheetModel): Promise<Blob> {
  const pdf = await PDFDocument.create()
  pdf.setTitle(model.title)
  pdf.setCreator('Set List Manager')
  const regular = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const italic = await pdf.embedFont(StandardFonts.HelveticaOblique)

  const columns = model.large ? 1 : 2
  const colW = (PAGE_W - MARGIN * 2 - GAP * (columns - 1)) / columns
  const textW = colW - INDENT
  const titleSize = model.large ? 24 : 14
  const artistSize = model.large ? 14 : 10
  const extraSize = model.large ? 12 : 9
  const gap = model.large ? 16 : 7

  const blocks: Block[] = model.items.map((item, i) => ({
    item,
    number: i + 1,
    title: wrap(safe(item.title, regular), regular, titleSize, textW),
    artist: item.artist ? wrap(safe(item.artist, italic), italic, artistSize, textW) : [],
    extras: item.extras ? wrap(safe(item.extras, regular), regular, extraSize, textW) : [],
  }))
  const heightOf = (b: Block) =>
    titleSize + (b.title.length - 1) * titleSize * 1.2 + b.artist.length * artistSize * 1.25 + b.extras.length * extraSize * 1.25 + gap

  // Header on the first page only.
  let headerH = 0
  const title = safe(model.title, bold)
  const titleLines = wrap(title, bold, 28, PAGE_W - MARGIN * 2)
  headerH += titleLines.length * 34 + 14
  if (model.subtitle) headerH += 20
  if (model.total) headerH += 16
  headerH += 22

  const firstCap = PAGE_H - MARGIN * 2 - headerH
  const laterCap = PAGE_H - MARGIN * 2
  const placed = blocks.map((b) => ({ item: b, height: heightOf(b) }))
  // First page has less room than later pages, so paginate the first page alone, then the rest.
  const firstPage = paginate(placed, firstCap, columns)[0] ?? Array.from({ length: columns }, () => [] as Block[])
  const usedCount = firstPage.reduce((n, col) => n + col.length, 0)
  const rest = paginate(placed.slice(usedCount), laterCap, columns)
  const pages = [firstPage, ...rest]

  pages.forEach((page, pageIndex) => {
    const p = pdf.addPage([PAGE_W, PAGE_H])
    let y = PAGE_H - MARGIN
    if (pageIndex === 0) {
      for (const line of titleLines) {
        const w = bold.widthOfTextAtSize(line, 28)
        y -= 28
        p.drawText(line, { x: (PAGE_W - w) / 2, y, size: 28, font: bold })
        y -= 6
      }
      y -= 6
      p.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 1.2, color: rgb(0.27, 0.27, 0.27) })
      y -= 6
      for (const [text, size] of [
        [model.subtitle, 11],
        [model.total, 10],
      ] as const) {
        if (!text) continue
        const t = safe(text, regular)
        y -= size + 6
        p.drawText(t, { x: (PAGE_W - regular.widthOfTextAtSize(t, size)) / 2, y, size, font: regular, color: GREY })
      }
      y -= 22
    }
    const top = y
    page.forEach((col, ci) => {
      let cy = top
      const x = MARGIN + ci * (colW + GAP)
      for (const b of col) {
        cy -= titleSize
        p.drawText(`${b.number}.`, { x, y: cy, size: titleSize - 2, font: bold })
        b.title.forEach((line, li) => {
          if (li > 0) cy -= titleSize * 1.2
          p.drawText(line, { x: x + INDENT, y: cy, size: titleSize, font: regular })
        })
        for (const line of b.artist) {
          cy -= artistSize * 1.25
          p.drawText(line, { x: x + INDENT, y: cy, size: artistSize, font: italic, color: GREY })
        }
        for (const line of b.extras) {
          cy -= extraSize * 1.25
          p.drawText(line, { x: x + INDENT, y: cy, size: extraSize, font: regular, color: GREY })
        }
        cy -= gap
      }
    })
  })

  const bytes = await pdf.save()
  return new Blob([bytes as BlobPart], { type: 'application/pdf' })
}
