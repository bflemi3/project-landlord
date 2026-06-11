import { Skeleton } from '@/components/ui/skeleton'
import { SuspenseFadeIn } from '@/components/suspense-fade-in'

import { BillsSummary } from './bills-summary'
import { BillsLedger } from './bills-ledger'

// Shared Bills tab content — both role views render this: current-month summary
// strip (+ overdue banner), then the month-grouped ledger. Borderless; sections
// are set apart by vertical space and a single hairline between them. The
// Company/Status/Date filter bar is intentionally not rendered (kept for a
// future phase — see the bills-ledger spec).
export function BillsPanel({ propertyId }: { propertyId: string }) {
  return (
    <div className="divide-border flex flex-col divide-y">
      <div className="pb-8">
        <SuspenseFadeIn fallback={<BillsSummarySkeleton />}>
          <BillsSummary propertyId={propertyId} />
        </SuspenseFadeIn>
      </div>
      <div className="pt-8">
        <SuspenseFadeIn fallback={<BillsLedgerSkeleton />}>
          <BillsLedger propertyId={propertyId} />
        </SuspenseFadeIn>
      </div>
    </div>
  )
}

function BillsSummarySkeleton() {
  return (
    <div className="grid grid-cols-3">
      {['a', 'b', 'c'].map((key) => (
        <div key={key} className="flex flex-col gap-1.5">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-5 w-20" />
        </div>
      ))}
    </div>
  )
}

function BillsLedgerSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-5 w-28" />
      {['a', 'b', 'c', 'd'].map((key) => (
        <div key={key} className="flex items-center gap-3">
          <Skeleton className="h-4 min-w-0 flex-1" />
          <Skeleton className="h-4 w-16 shrink-0" />
          <Skeleton className="h-5 w-16 shrink-0 rounded-full" />
        </div>
      ))}
    </div>
  )
}
