import { PropertyCreationWizard } from '../property-creation-wizard'

export default async function NewPropertyDraftPage({
  params,
}: {
  params: Promise<{ draftId: string }>
}) {
  const { draftId } = await params
  return <PropertyCreationWizard draftId={draftId} />
}
