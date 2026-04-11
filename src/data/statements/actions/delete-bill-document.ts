'use server'

import { createClient } from '@/lib/supabase/server'
import type { TypedSupabaseClient } from '@/lib/supabase/types'

export async function deleteBillDocumentCore(
  supabase: TypedSupabaseClient,
  documentId: string,
): Promise<{ success: boolean }> {
  const { data: doc, error } = await supabase
    .from('source_documents')
    .select('file_path')
    .eq('id', documentId)
    .single()

  if (error || !doc) return { success: false }

  await supabase.storage
    .from('source-documents')
    .remove([doc.file_path])

  await supabase
    .from('source_documents')
    .delete()
    .eq('id', documentId)

  return { success: true }
}

export async function deleteBillDocument(
  documentId: string,
): Promise<{ success: boolean }> {
  const supabase = await createClient()
  return deleteBillDocumentCore(supabase, documentId)
}
