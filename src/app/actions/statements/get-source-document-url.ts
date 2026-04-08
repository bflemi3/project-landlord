'use server'

import { createClient } from '@/lib/supabase/server'
import type { TypedSupabaseClient } from '@/lib/supabase/types'

export async function getSourceDocumentUrlCore(
  supabase: TypedSupabaseClient,
  documentId: string,
): Promise<{ url: string | null }> {
  const { data: doc, error } = await supabase
    .from('source_documents')
    .select('file_path')
    .eq('id', documentId)
    .single()

  if (error || !doc) return { url: null }

  const { data: signed, error: signError } = await supabase.storage
    .from('source-documents')
    .createSignedUrl(doc.file_path, 3600)

  if (signError || !signed) return { url: null }

  return { url: signed.signedUrl }
}

export async function getSourceDocumentUrl(
  documentId: string,
): Promise<{ url: string | null }> {
  const supabase = await createClient()
  return getSourceDocumentUrlCore(supabase, documentId)
}
