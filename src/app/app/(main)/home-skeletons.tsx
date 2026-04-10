/**
 * Skeleton fallbacks for home page Suspense boundaries.
 * Structurally match the resolved content to prevent layout shift.
 */

export function GreetingSkeleton() {
  return (
    <div className="mb-8">
      <div className="h-8 w-64 animate-pulse rounded-lg bg-muted" />
    </div>
  )
}

const CARD_SKELETON_CLASS =
  'w-full overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm dark:bg-zinc-800/80 dark:shadow-none'

function CardSkeleton() {
  return (
    <div className={CARD_SKELETON_CLASS}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="h-5 w-40 animate-pulse rounded bg-muted" />
          <div className="mt-1.5 h-4 w-24 animate-pulse rounded bg-muted" />
        </div>
      </div>
      <div className="mt-3">
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
      </div>
    </div>
  )
}

export function CardsSkeleton() {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <CardSkeleton />
      <CardSkeleton />
    </div>
  )
}

export function ActionsSkeleton() {
  return (
    <div className="mt-8">
      <div className="mb-3 h-5 w-28 animate-pulse rounded bg-muted" />
      <div className="space-y-2">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="flex w-full items-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5 dark:border-zinc-700 dark:bg-zinc-800/50"
          >
            <div className="size-9 shrink-0 animate-pulse rounded-lg bg-muted" />
            <div className="min-w-0 flex-1">
              <div className="h-4 w-36 animate-pulse rounded bg-muted" />
              <div className="mt-1.5 h-3 w-24 animate-pulse rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
