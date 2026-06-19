import { Card } from '@/components/ui/card'

export function GreetingSkeleton() {
  return (
    <div className="mb-8 flex items-center justify-between gap-4">
      <div className="bg-muted h-8 w-64 animate-pulse rounded-lg" />
      <div className="bg-muted size-10 shrink-0 animate-pulse rounded-full sm:h-9 sm:w-36 sm:rounded-2xl" />
    </div>
  )
}

export function RevenueSummarySkeleton() {
  return (
    <Card size="lg" className="mb-6">
      <div className="grid gap-6 sm:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i}>
            <div className="bg-muted h-3 w-24 animate-pulse rounded" />
            <div className="bg-muted mt-2 h-9 w-40 animate-pulse rounded sm:h-10" />
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
        <div className="bg-muted size-5 shrink-0 animate-pulse rounded" />
        <div className="min-w-0 flex-1">
          <div className="bg-muted h-4 w-40 animate-pulse rounded" />
          <div className="bg-muted mt-1.5 h-3 w-32 animate-pulse rounded" />
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <div className="flex items-center gap-3">
            <div className="bg-muted h-4 w-20 animate-pulse rounded" />
            <div className="bg-muted h-3 w-14 animate-pulse rounded" />
          </div>
          <div className="bg-muted h-3 w-24 animate-pulse rounded" />
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
