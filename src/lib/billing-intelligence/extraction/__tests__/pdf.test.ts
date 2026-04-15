import { describe, it, expect, vi } from 'vitest'
import { extractTextFromPdf } from '../pdf'

vi.mock('unpdf', () => ({
  getDocumentProxy: () => Promise.resolve({ destroy: () => Promise.resolve() }),
  extractText: () => Promise.resolve({
    totalPages: 2,
    text: 'Page 1 content\nPage 2 content',
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
