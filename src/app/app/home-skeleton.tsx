import { Skeleton } from '@/components/ui/skeleton'

/**
 * Home page loading skeleton.
 * Matches the populated state layout with centered max-width constraint.
 * Shows 1 card on mobile, 2-column grid on desktop.
 */
export function HomeSkeleton() {
  return (
    <div className="flex h-svh flex-col">
      <div className="flex-1 overflow-y-auto px-6 pt-14 pb-4">
        <div className="mx-auto max-w-4xl">
          {/* Header — greeting */}
          <div className="mb-8">
            <Skeleton className="h-8 w-56 rounded-lg" />
            <Skeleton className="mt-2 h-5 w-32 rounded-lg" />
          </div>

          {/* Property cards — 1 col mobile, 2 col desktop */}
          <div className="grid gap-3 md:grid-cols-2">
            <Skeleton className="h-44 w-full rounded-2xl" />
            <Skeleton className="hidden h-44 w-full rounded-2xl md:block" />
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="shrink-0 border-t border-border px-6 py-4">
        <div className="mx-auto flex max-w-4xl justify-center">
          <Skeleton className="h-10 w-40 rounded-2xl" />
        </div>
      </div>
    </div>
  )
}
