import { Skeleton } from '@/components/ui/skeleton'

export function HomeSkeleton() {
  return (
    <div className="mx-auto min-h-svh max-w-2xl px-6 pb-32 pt-8">
      {/* Header skeleton */}
      <div className="mb-10 flex items-start justify-between">
        <div>
          <Skeleton className="h-7 w-52 rounded-lg" />
          <Skeleton className="mt-2 h-4 w-36 rounded-lg" />
        </div>
        <Skeleton className="h-9 w-20 rounded-2xl" />
      </div>

      {/* Content skeleton — matches empty state */}
      <div className="mt-8">
        <div className="mb-10 text-center">
          <Skeleton className="mx-auto h-6 w-48 rounded-lg" />
          <Skeleton className="mx-auto mt-3 h-4 w-56 rounded-lg" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  )
}
