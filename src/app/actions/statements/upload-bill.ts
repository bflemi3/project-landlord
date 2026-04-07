'use server'

import { createClient } from '@/lib/supabase/server'
import type { TypedSupabaseClient } from '@/lib/supabase/types'

export interface UploadBillResult {
  success: boolean
  documentId?: string
  error?: string
}

export async function uploadBillDocumentCore(
  supabase: TypedSupabaseClient,
  unitId: string,
  file: File,
  periodYear: number,
  periodMonth: number,
): Promise<UploadBillResult> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const fileExt = file.name.split('.').pop() ?? ''
  const storagePath = `${unitId}/${periodYear}-${String(periodMonth).padStart(2, '0')}/${crypto.randomUUID()}.${fileExt}`

  const { error: uploadError } = await supabase.storage
    .from('source-documents')
    .upload(storagePath, file)

  if (uploadError) {
    return { success: false, error: uploadError.message }
  }

  const { data: doc, error: dbError } = await supabase
    .from('source_documents')
    .insert({
      unit_id: unitId,
      file_path: storagePath,
      file_name: file.name,
      mime_type: file.type,
      file_size_bytes: file.size,
      period_year: periodYear,
      period_month: periodMonth,
      uploaded_by: user.id,
      ingestion_status: 'uploaded',
    })
    .select('id')
    .single()

  if (dbError || !doc) {
    return { success: false, error: dbError?.message ?? 'Failed to create document record' }
  }

  return { success: true, documentId: doc.id }
}

export async function uploadBillDocument(
  unitId: string,
  file: File,
  periodYear: number,
  periodMonth: number,
): Promise<UploadBillResult> {
  const supabase = await createClient()
  return uploadBillDocumentCore(supabase, unitId, file, periodYear, periodMonth)
}
