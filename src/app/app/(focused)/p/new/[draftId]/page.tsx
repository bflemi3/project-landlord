import { PropertyCreationStoreProvider } from './state/store-provider'
import { PropertyCreationWizard } from './wizard'

export default async function NewPropertyDraftPage({
  params,
}: {
  params: Promise<{ draftId: string }>
}) {
  const { draftId } = await params
  return (
    <PropertyCreationStoreProvider draftId={draftId} key={draftId}>
      <PropertyCreationWizard draftId={draftId} />
    </PropertyCreationStoreProvider>
  )
}
