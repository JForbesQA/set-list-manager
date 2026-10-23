import { fileStem, type SheetModel } from './sheet'

export type ExportKind = 'pdf' | 'docx'

const TYPES: Record<ExportKind, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
}

/** Builds the PDF or Word file for a sheet. The export code is loaded on demand, so the app stays small. */
export async function buildSheetFile(kind: ExportKind, model: SheetModel): Promise<File> {
  const blob =
    kind === 'pdf'
      ? await (await import('./pdfExport')).buildPdf(model)
      : await (await import('./docxExport')).buildDocx(model)
  return new File([blob], `${fileStem(model.title)}.${kind}`, { type: TYPES[kind] })
}
