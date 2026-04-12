'use server'

import { PDFParse } from 'pdf-parse'
import { parseEnlivBillText } from '@/lib/providers/enliv/pdf-parser'

export async function extractEnlivBill(formData: FormData) {
  const file = formData.get('file') as File | null
  if (!file) {
    return { success: false as const, error: 'No file provided' }
  }

  try {
    const arrayBuffer = await file.arrayBuffer()
    const uint8 = new Uint8Array(arrayBuffer)
    const parser = new PDFParse(uint8)
    const result = await parser.getText()
    const text = result.pages.map((p: { text: string }) => p.text).join('\n')
    const extraction = parseEnlivBillText(text)

    return { success: true as const, data: extraction, rawText: text }
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'PDF parsing failed',
    }
  }
}
