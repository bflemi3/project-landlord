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

  // Point workerSrc to the actual worker file path.
  // In serverless, isNodeJS detection auto-disables the worker,
  // but workerSrc must still be set to avoid the "No workerSrc" error.
  const workerPath = require.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs')
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerPath

  const doc = await pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    useWorkerFetch: false,
    isEvalSupported: false,
    disableFontFace: true,
  }).promise
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
