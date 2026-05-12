import { Card } from '@/components/ui/card'

export function GreetingSkeleton() {
  return (
    <div className="mb-8 flex items-center justify-between gap-4">
      <div className="h-8 w-64 animate-pulse rounded-lg bg-muted" />
      <div className="size-10 shrink-0 animate-pulse rounded-full bg-muted sm:h-9 sm:w-36 sm:rounded-2xl" />
    </div>
  )
}

export function RevenueSummarySkeleton() {
  return (
    <Card size="lg" className="mb-6">
      <div className="grid gap-6 sm:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i}>
            <div className="h-3 w-24 animate-pulse rounded bg-muted" />
            <div className="mt-2 h-9 w-40 animate-pulse rounded bg-muted sm:h-10" />
          </div>
        ))}
      </div>
    </Card>
  )
}

function RowSkeleton() {
  return (
    <Card size="none">
      <div className="flex items-center gap-4 px-5 py-4">
        <div className="size-5 shrink-0 animate-pulse rounded bg-muted" />
        <div className="min-w-0 flex-1">
          <div className="h-4 w-40 animate-pulse rounded bg-muted" />
          <div className="mt-1.5 h-3 w-32 animate-pulse rounded bg-muted" />
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <div className="flex items-center gap-3">
            <div className="h-4 w-20 animate-pulse rounded bg-muted" />
            <div className="h-3 w-14 animate-pulse rounded bg-muted" />
          </div>
          <div className="h-3 w-24 animate-pulse rounded bg-muted" />
        </div>
      </div>
    </Card>
  )
}

export function CardsSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <RowSkeleton />
      <RowSkeleton />
    </div>
  )
}
