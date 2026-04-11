/**
 * Skeleton fallbacks for statement draft page Suspense boundaries.
 * Structurally match the resolved content to prevent layout shift.
 */

export function StatementHeaderSkeleton() {
  return (
    <>
      {/* Close button */}
      <div className="mb-4 flex justify-end">
        <div className="size-8 animate-pulse rounded-full bg-muted" />
      </div>
      {/* Title + badge */}
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <div className="h-8 w-64 animate-pulse rounded-lg bg-muted" />
          <div className="h-5 w-12 animate-pulse rounded-full border border-dashed border-muted bg-transparent" />
        </div>
        <div className="mt-1.5 h-4 w-80 animate-pulse rounded bg-muted" />
      </div>
    </>
  )
}

export function SummaryCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 dark:bg-zinc-800/80">
      {/* "Tenant owes" label */}
      <div className="h-4 w-24 animate-pulse rounded bg-muted" />
      {/* Amount */}
      <div className="mt-2 h-9 w-32 animate-pulse rounded-lg bg-muted" />
      {/* Publish status */}
      <div className="mt-3 h-4 w-56 animate-pulse rounded bg-muted" />
      {/* Payment due */}
      <div className="mt-1.5 h-4 w-44 animate-pulse rounded bg-muted" />

      {/* Separator + split breakdown */}
      <div className="my-4 h-px w-full bg-border dark:bg-zinc-600" />
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="h-4 w-20 animate-pulse rounded bg-muted" />
          <div className="h-4 w-16 animate-pulse rounded bg-muted" />
        </div>
        <div className="flex items-center justify-between">
          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          <div className="h-4 w-16 animate-pulse rounded bg-muted" />
        </div>
      </div>
    </div>
  )
}

export function CompletenessWarningSkeleton() {
  return (
    <div className="h-16 animate-pulse rounded-2xl border border-border bg-muted/30" />
  )
}

export function ChargesListSkeleton() {
  return (
    <div>
      {/* Header: "Charges (n)" + "+ Add" */}
      <div className="mb-3 flex items-center justify-between">
        <div className="h-5 w-24 animate-pulse rounded bg-muted" />
        <div className="h-8 w-16 animate-pulse rounded bg-muted" />
      </div>

      {/* Charge rows */}
      <div className="space-y-1 rounded-2xl border border-border p-1.5">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="flex items-center gap-3 border-transparent px-4 py-3.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted" />
            <div className="min-w-0 flex-1">
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              <div className="mt-1.5 h-3 w-32 animate-pulse rounded bg-muted" />
            </div>
            <div className="h-4 w-16 animate-pulse rounded bg-muted" />
          </div>
        ))}

        {/* Total row */}
        <div className="flex items-center justify-between border-t border-border px-4 py-3.5">
          <div className="h-4 w-10 animate-pulse rounded bg-muted" />
          <div className="h-5 w-20 animate-pulse rounded bg-muted" />
        </div>
      </div>
    </div>
  )
}
