import { describe, it, expect, vi } from 'vitest'
import { extractTextFromPdf } from '../pdf'

// Mock pdf-parse since we can't load real PDFs in unit tests
vi.mock('pdf-parse', () => ({
  PDFParse: class {
    constructor(_data: Uint8Array) {}
    async getText() {
      return {
        pages: [
          { text: 'Page 1 content' },
          { text: 'Page 2 content' },
        ],
      }
    }
  },
}))

describe('extractTextFromPdf', () => {
  it('returns concatenated text from all pages', async () => {
    const buffer = new ArrayBuffer(8)
    const result = await extractTextFromPdf(buffer)
    expect(result).toBe('Page 1 content\nPage 2 content')
  })

  it('returns string type', async () => {
    const buffer = new ArrayBuffer(8)
    const result = await extractTextFromPdf(buffer)
    expect(typeof result).toBe('string')
  })
})
