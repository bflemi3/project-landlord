'use server'

import pdf from 'pdf-parse'
import { extractCnpjsFromText, lookupCnpj } from '@/lib/cnpj/lookup'
import type { CnpjIdentification } from '@/lib/cnpj/types'

export async function identifyBillProvider(formData: FormData) {
  const file = formData.get('file') as File | null
  if (!file) {
    return { success: false as const, error: 'No file provided' }
  }

  try {
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const pdfData = await pdf(buffer)

    const cnpjs = extractCnpjsFromText(pdfData.text)

    if (cnpjs.length === 0) {
      return {
        success: false as const,
        error: 'No CNPJ found in PDF',
        rawText: pdfData.text,
      }
    }

    const results: CnpjIdentification[] = []
    const errors: string[] = []

    for (const cnpj of cnpjs) {
      try {
        const result = await lookupCnpj(cnpj)
        results.push(result)
      } catch (err) {
        errors.push(
          `${cnpj}: ${err instanceof Error ? err.message : 'lookup failed'}`,
        )
      }
    }

    return {
      success: true as const,
      data: { cnpjsFound: cnpjs, lookups: results, errors },
      rawText: pdfData.text,
    }
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'PDF parsing failed',
    }
  }
}
