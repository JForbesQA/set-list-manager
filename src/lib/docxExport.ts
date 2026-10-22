import {
  AlignmentType,
  BorderStyle,
  Document,
  LevelFormat,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx'
import type { SheetItem, SheetModel } from './sheet'

const GREY = '666666'
const FONT = 'Arial'
const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
const NO_BORDERS = { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER }

/**
 * A Word version of the sheet: centred title with a rule, then a numbered list in two columns.
 * The columns are a borderless two-cell table (the same trick as the original printed set list),
 * which renders the same in Word, Pages and Google Docs, unlike Word's own column setting.
 */
export async function buildDocx(model: SheetModel): Promise<Blob> {
  const run = (text: string, extra: Partial<ConstructorParameters<typeof TextRun>[0] & object> = {}) =>
    new TextRun({ text, font: FONT, ...extra })

  const header: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: model.subtitle || model.total ? 120 : 320 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 8, space: 6, color: '444444' } },
      children: [run(model.title, { bold: true, size: 56 })],
    }),
  ]
  const lines = [model.subtitle, model.total].filter(Boolean)
  lines.forEach((text, i) => {
    header.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: i === lines.length - 1 ? 320 : 60 },
        children: [run(text, { color: GREY, size: 20 })],
      }),
    )
  })

  const song = (item: SheetItem) =>
    new Paragraph({
      numbering: { reference: 'songs', level: 0 },
      spacing: { after: 150 },
      keepLines: true,
      children: [
        run(item.title, { size: model.large ? 40 : 28 }),
        ...(item.artist ? [run(item.artist, { italics: true, color: GREY, size: model.large ? 24 : 20, break: 1 })] : []),
        ...(item.extras ? [run(item.extras, { color: GREY, size: model.large ? 22 : 18, break: 1 })] : []),
      ],
    })

  const columns = model.large ? 1 : 2
  const perColumn = Math.ceil(model.items.length / columns)
  const cells = Array.from({ length: columns }, (_, c) => {
    const part = model.items.slice(c * perColumn, (c + 1) * perColumn)
    return new TableCell({
      borders: NO_BORDERS,
      width: { size: 100 / columns, type: WidthType.PERCENTAGE },
      margins: { left: 80, right: 80 },
      // A cell must hold at least one paragraph.
      children: part.length > 0 ? part.map(song) : [new Paragraph({ children: [] })],
    })
  })

  const doc = new Document({
    creator: 'Set List Manager',
    title: model.title,
    numbering: {
      config: [
        {
          reference: 'songs',
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: '%1.',
              alignment: AlignmentType.LEFT,
              style: {
                run: { font: FONT, bold: true },
                paragraph: { indent: { left: 540, hanging: 360 } },
              },
            },
          ],
        },
      ],
    },
    sections: [
      {
        children: [
          ...header,
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: { ...NO_BORDERS, insideHorizontal: NO_BORDER, insideVertical: NO_BORDER },
            rows: [new TableRow({ children: cells })],
          }),
        ],
      },
    ],
  })
  return Packer.toBlob(doc)
}
