import { afterEach, describe, expect, it, vi } from 'vitest'
import { shareFile, shareOrDownload } from './deliver'

const file = () => new File(['x'], 'open-mic-opener.docx', { type: 'application/pdf' })

afterEach(() => vi.unstubAllGlobals())

describe('sharing a file', () => {
  it('passes only the file to the share sheet, so iOS does not save an extra text file', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { share, canShare: () => true })
    const f = file()
    await shareFile(f)
    expect(share).toHaveBeenCalledTimes(1)
    const data = share.mock.calls[0][0]
    expect(Object.keys(data)).toEqual(['files'])
    expect(data.files).toEqual([f])
  })

  it('shareOrDownload uses the same file-only share and reports it', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { share, canShare: () => true })
    expect(await shareOrDownload(file())).toBe('shared')
    expect(Object.keys(share.mock.calls[0][0])).toEqual(['files'])
  })

  it('treats closing the share sheet as cancelled, not as a download', async () => {
    const share = vi.fn().mockRejectedValue(new DOMException('closed', 'AbortError'))
    vi.stubGlobal('navigator', { share, canShare: () => true })
    expect(await shareOrDownload(file())).toBe('cancelled')
  })
})
