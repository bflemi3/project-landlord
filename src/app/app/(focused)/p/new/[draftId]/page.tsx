import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { getUserId } from '@/lib/supabase/get-user-id'

import { PropertyCreationStoreProvider } from './state/store-provider'
import { PropertyCreationWizard } from './wizard'

export default async function NewPropertyDraftPage({
  params,
}: {
  params: Promise<{ draftId: string }>
}) {
  const { draftId } = await params

  // Stale-draft redirect (spec §Stale draft URL after success).
  //
  // If the user revisits `/p/new/[draftId]` after a successful submit
  // (bookmark, history, accidental nav), the property already exists for
  // them — we send them straight to the property page. Cheap RLS-scoped
  // probe: SELECT id FROM properties WHERE id = $1. RLS limits the row to
  // members the viewer belongs to, so a non-member sees no row and the
  // wizard renders normally for any other draft id.
  const userId = await getUserId()
  if (userId) {
    const supabase = await createClient()
    const { data: existingProperty } = await supabase
      .from('properties')
      .select('id')
      .eq('id', draftId)
      .is('deleted_at', null)
      .maybeSingle()

    if (existingProperty) {
      redirect(`/app/p/${draftId}`)
    }
  }

  return (
    <PropertyCreationStoreProvider draftId={draftId} key={draftId}>
      <PropertyCreationWizard draftId={draftId} />
    </PropertyCreationStoreProvider>
  )
}
