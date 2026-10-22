import { canShareFile } from './backup'

export type DeliverResult = 'shared' | 'downloaded' | 'cancelled'

/**
 * Opens the share sheet with the file and nothing else. Do not add `title` or `text`: iOS saves those as
 * a separate extra "text" file next to the real one when you choose Save to Files.
 */
export function shareFile(file: File): Promise<void> {
  return navigator.share({ files: [file] })
}

/**
 * Hands a file to the system share sheet (Save to Files, AirDrop, Mail...) where the browser supports it,
 * and falls back to a normal download. Installed iPhone web apps cannot print or reliably download,
 * so the share sheet is the dependable route there.
 */
export async function shareOrDownload(file: File): Promise<DeliverResult> {
  if (canShareFile(file)) {
    try {
      await shareFile(file)
      return 'shared'
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return 'cancelled'
      // Any other share failure: fall through to a plain download.
    }
  }
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  a.click()
  URL.revokeObjectURL(url)
  return 'downloaded'
}
