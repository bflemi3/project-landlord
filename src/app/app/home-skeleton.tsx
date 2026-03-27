import { Skeleton } from '@/components/ui/skeleton'

/**
 * Home page loading skeleton.
 * Matches the populated state layout (header + cards + bottom bar)
 * since returning users are the common case. New users see a brief
 * flash before the empty state renders — acceptable tradeoff.
 */
export function HomeSkeleton() {
  return (
    <div className="flex h-svh flex-col">
      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto px-6 pt-8 pb-4">
        {/* Header — greeting + sign out */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <Skeleton className="h-8 w-56 rounded-lg" />
            <Skeleton className="mt-2 h-5 w-32 rounded-lg" />
          </div>
          <Skeleton className="size-5 rounded-full" />
        </div>

        {/* Property cards */}
        <div className="grid gap-3 md:grid-cols-2">
          <Skeleton className="h-44 w-full rounded-2xl" />
          <Skeleton className="h-44 w-full rounded-2xl" />
        </div>
      </div>

      {/* Bottom bar */}
      <div className="shrink-0 border-t border-border px-6 py-4">
        <div className="mx-auto max-w-3xl">
          <Skeleton className="h-10 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  )
}
