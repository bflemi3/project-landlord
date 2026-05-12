'use server'

import { extractContract } from '@/lib/contract-extraction/extract-contract'
import type { ContractExtractionResponse } from '@/lib/contract-extraction/types'

const MAX_FILE_SIZE = 10 * 1024 * 1024

export async function extractContractAction(
  formData: FormData,
): Promise<ContractExtractionResponse> {
  const file = formData.get('file')
  const rawType = formData.get('fileType')

  if (rawType !== 'pdf' && rawType !== 'docx') {
    return { success: false, error: { code: 'unsupported_format' } }
  }

  const fileType = rawType

  if (!file || typeof file === 'string') {
    return { success: false, error: { code: 'empty_file' } }
  }

  if (file.size === 0) {
    return { success: false, error: { code: 'empty_file' } }
  }

  if (file.size > MAX_FILE_SIZE) {
    return { success: false, error: { code: 'file_too_large' } }
  }

  try {
    const arrayBuffer = await file.arrayBuffer()
    const fileBuffer = Buffer.from(arrayBuffer)

    return await extractContract({ fileBuffer, fileType })
  } catch (e) {
    console.error('[extractContractAction] unexpected engine error:', e)
    return { success: false, error: { code: 'extraction_failed' } }
  }
}
