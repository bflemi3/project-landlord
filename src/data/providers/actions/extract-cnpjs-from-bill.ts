'use server'

import { extractTextFromPdf } from '@/lib/billing-intelligence/extraction/pdf'
import { extractCnpjsFromText } from '@/lib/billing-intelligence/identification/cnpj-extract'
import { assertEngineer } from '@/lib/supabase/assert-engineer'

export interface ExtractCnpjsResult {
  success: boolean
  cnpjs: string[]
  message?: string
}

export async function extractCnpjsFromBill(formData: FormData): Promise<ExtractCnpjsResult> {
  try {
    await assertEngineer()
  } catch {
    return { success: false, cnpjs: [], message: 'Engineer access required' }
  }

  const file = formData.get('file') as File | null

  if (!file) {
    return { success: false, cnpjs: [], message: 'No file provided' }
  }

  if (file.type !== 'application/pdf') {
    return { success: false, cnpjs: [], message: 'Only PDF files are supported' }
  }

  let text: string
  try {
    const buffer = await file.arrayBuffer()
    text = await extractTextFromPdf(buffer)
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    return {
      success: false,
      cnpjs: [],
      message: `PDF extraction failed: ${detail}\nFile: ${file.name} (${(file.size / 1024).toFixed(0)} KB, type: ${file.type})`,
    }
  }

  const cnpjs = extractCnpjsFromText(text)

  if (cnpjs.length === 0) {
    return {
      success: true,
      cnpjs: [],
      message: 'No CNPJs found in this document. You can enter a tax ID manually.',
    }
  }

  return { success: true, cnpjs }
}
