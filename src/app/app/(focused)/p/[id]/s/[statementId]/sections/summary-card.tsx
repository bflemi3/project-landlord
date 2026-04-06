'use client'

export function SummaryCard({
  total,
  dueDateLabel,
  isEstimated,
}: {
  total: string
  dueDateLabel: string
  isEstimated: boolean
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 dark:bg-zinc-800/80">
      <p className="text-sm text-muted-foreground">
        {isEstimated ? 'Estimated total' : 'Total due'}
      </p>
      <p className="mt-1 text-3xl font-bold tabular-nums text-foreground">{total}</p>
      <p className="mt-2 text-sm text-muted-foreground">Due {dueDateLabel}</p>
    </div>
  )
}
