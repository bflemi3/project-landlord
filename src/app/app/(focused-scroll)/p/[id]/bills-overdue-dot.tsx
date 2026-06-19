import { Dot } from '@/components/ui/dot'
import { getPropertyBillsSummary } from '@/data/charges/server'

// Attention dot for the Bills tab — rendered whenever the overdue banner is
// (property overdue > 0). Server component slotted into the client tab nav via
// the `indicators` prop; positioning is the nav's job.
export async function BillsOverdueDot({ propertyId }: { propertyId: string }) {
  const summary = await getPropertyBillsSummary(propertyId)
  if (summary.property.overdueMinor === 0) return null
  return <Dot tone="destructive" className="block" />
}
