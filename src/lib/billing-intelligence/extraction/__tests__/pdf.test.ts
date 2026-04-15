import { describe, it, expect, vi } from 'vitest'
import { extractTextFromPdf } from '../pdf'

// Mock pdfjs-dist since we can't load real PDFs in unit tests
vi.mock('pdfjs-dist/legacy/build/pdf.mjs', () => ({
  getDocument: () => ({
    promise: Promise.resolve({
      numPages: 2,
      getPage: (num: number) => Promise.resolve({
        getTextContent: () => Promise.resolve({
          items: [
            { str: `Page ${num} content` },
          ],
        }),
      }),
    }),
  }),
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
