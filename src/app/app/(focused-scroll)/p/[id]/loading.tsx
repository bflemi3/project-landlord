import { Skeleton } from '@/components/ui/skeleton'

// Structural match for the property page so navigation paints instantly. Update
// the content rows to mirror the bills ledger once it's built.
export default function Loading() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-2 py-1">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="size-9 rounded-md" />
      </div>

      <div className="flex gap-2">
        <Skeleton className="h-10 w-28" />
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-32" />
      </div>

      <div className="flex flex-col gap-3">
        {['a', 'b', 'c', 'd'].map((key) => (
          <div key={key} className="flex items-center justify-between gap-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-5 w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}
