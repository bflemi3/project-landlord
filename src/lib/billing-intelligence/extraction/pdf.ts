/**
 * Extract raw text from a PDF buffer.
 * Uses pdfjs-dist directly with a DOMMatrix polyfill for serverless environments.
 * Returns concatenated text from all pages.
 */
export async function extractTextFromPdf(buffer: ArrayBuffer): Promise<string> {
  // Polyfill DOMMatrix for serverless (Vercel Lambda) where it doesn't exist
  if (typeof globalThis.DOMMatrix === 'undefined') {
    // pdfjs-dist only needs a minimal DOMMatrix for text extraction
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    globalThis.DOMMatrix = class DOMMatrix {
      constructor() { return Object.create(DOMMatrix.prototype) }
    } as any
  }

  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')

  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise
  const pages: string[] = []

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()
    const text = content.items
      .filter((item) => 'str' in item)
      .map((item) => (item as { str: string }).str)
      .join('')
    pages.push(text)
  }

  return pages.join('\n')
}
