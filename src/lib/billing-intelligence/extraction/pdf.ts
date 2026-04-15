import { extractText, getDocumentProxy } from 'unpdf'

/**
 * Extract raw text from a PDF buffer.
 * Uses unpdf which bundles PDF.js for serverless environments
 * (no native dependencies, no worker files, works on Vercel Lambda).
 */
export async function extractTextFromPdf(buffer: ArrayBuffer): Promise<string> {
  const pdf = await getDocumentProxy(new Uint8Array(buffer))
  const { text } = await extractText(pdf, { mergePages: true })
  await pdf.destroy()
  return text
}
