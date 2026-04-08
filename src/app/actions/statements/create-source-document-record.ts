'use server'

import { createClient } from '@/lib/supabase/server'
import type { TypedSupabaseClient } from '@/lib/supabase/types'

export interface CreateSourceDocumentInput {
  unitId: string
  filePath: string
  fileName: string
  mimeType: string
  fileSizeBytes: number
  periodYear: number
  periodMonth: number
}

export async function createSourceDocumentRecordCore(
  supabase: TypedSupabaseClient,
  input: CreateSourceDocumentInput,
): Promise<{ documentId: string | null }> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { documentId: null }

  const { data: doc, error } = await supabase
    .from('source_documents')
    .insert({
      unit_id: input.unitId,
      file_path: input.filePath,
      file_name: input.fileName,
      mime_type: input.mimeType,
      file_size_bytes: input.fileSizeBytes,
      period_year: input.periodYear,
      period_month: input.periodMonth,
      uploaded_by: user.id,
      ingestion_status: 'uploaded',
    })
    .select('id')
    .single()

  if (error || !doc) return { documentId: null }

  return { documentId: doc.id }
}

export async function createSourceDocumentRecord(
  input: CreateSourceDocumentInput,
): Promise<{ documentId: string | null }> {
  const supabase = await createClient()
  return createSourceDocumentRecordCore(supabase, input)
}
