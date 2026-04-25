import { Suspense } from 'react'
import { PropertyCreationWizard } from './wizard'
import { WizardHydrationFallback } from './wizard-hydration-fallback'

export default async function NewPropertyDraftPage({
  params,
}: {
  params: Promise<{ draftId: string }>
}) {
  const { draftId } = await params
  return (
    <Suspense fallback={<WizardHydrationFallback />}>
      <PropertyCreationWizard draftId={draftId} />
    </Suspense>
  )
}
