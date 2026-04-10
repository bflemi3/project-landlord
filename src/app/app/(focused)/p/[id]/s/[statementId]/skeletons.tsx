export function SummaryCardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-border bg-card p-5 dark:bg-zinc-800/80">
      <div className="h-4 w-28 rounded bg-muted" />
      <div className="mt-2 h-9 w-36 rounded bg-muted" />
      <div className="mt-3 h-4 w-44 rounded bg-muted" />
      <div className="mt-1 h-4 w-40 rounded bg-muted" />
    </div>
  )
}

export function CompletenessWarningSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-amber-500/20 bg-amber-500/10 px-5 py-4">
      <div className="h-4 w-48 rounded bg-amber-500/20" />
      <div className="mt-2 h-3 w-64 rounded bg-amber-500/10" />
    </div>
  )
}

export function ChargesListSkeleton() {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="h-5 w-24 animate-pulse rounded bg-muted" />
      </div>
      <div className="space-y-1 rounded-2xl border border-border p-1.5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex animate-pulse items-center gap-3 rounded-xl px-4 py-3.5">
            <div className="size-9 rounded-lg bg-muted" />
            <div className="flex-1">
              <div className="h-4 w-32 rounded bg-muted" />
              <div className="mt-1 h-3 w-20 rounded bg-muted" />
            </div>
            <div className="h-5 w-16 rounded bg-muted" />
          </div>
        ))}
        <div className="flex items-center justify-between border-t border-border px-4 py-3.5">
          <div className="h-4 w-12 animate-pulse rounded bg-muted" />
          <div className="h-5 w-20 animate-pulse rounded bg-muted" />
        </div>
      </div>
    </div>
  )
}
