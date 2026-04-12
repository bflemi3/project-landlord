'use server'

import pdf from 'pdf-parse'
import { parseEnlivBillText } from '@/lib/providers/enliv/pdf-parser'

export async function extractEnlivBill(formData: FormData) {
  const file = formData.get('file') as File | null
  if (!file) {
    return { success: false as const, error: 'No file provided' }
  }

  try {
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const pdfData = await pdf(buffer)
    const extraction = parseEnlivBillText(pdfData.text)

    return { success: true as const, data: extraction, rawText: pdfData.text }
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'PDF parsing failed',
    }
  }
}
