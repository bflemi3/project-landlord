import { PDFParse } from 'pdf-parse'

/**
 * Extract raw text from a PDF buffer.
 * Returns concatenated text from all pages.
 * Provider parsers receive text, not PDF buffers.
 */
export async function extractTextFromPdf(buffer: ArrayBuffer): Promise<string> {
  const uint8 = new Uint8Array(buffer)
  const parser = new PDFParse(uint8)
  const result = await parser.getText()
  return result.pages.map((p: { text: string }) => p.text).join('\n')
}
