import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function NewPropertyPage() {
  const draftId = crypto.randomUUID()
  redirect(`/app/p/new/${draftId}`)
}
