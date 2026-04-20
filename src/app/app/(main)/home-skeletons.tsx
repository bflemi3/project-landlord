/**
 * Skeleton fallbacks for home page Suspense boundaries.
 * Structurally match the resolved content to prevent layout shift.
 */

import { Card } from '@/components/ui/card'
import { List, listRowClassName } from '@/components/list-row'

export function GreetingSkeleton() {
  return (
    <div className="mb-8 flex items-center justify-between gap-4">
      <div className="h-8 w-64 animate-pulse rounded-lg bg-muted" />
      <div className="size-10 shrink-0 animate-pulse rounded-full bg-muted sm:h-9 sm:w-36 sm:rounded-2xl" />
    </div>
  )
}

function CardSkeleton() {
  return (
    <Card size="xl" className="w-full overflow-hidden">
      {/* Eyebrow + title + subtitle on left, chevron on right */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="h-3 w-24 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-6 w-48 animate-pulse rounded bg-muted" />
          <div className="mt-1.5 h-4 w-32 animate-pulse rounded bg-muted" />
        </div>
        <div className="mt-1 size-5 shrink-0 animate-pulse rounded bg-muted" />
      </div>

      {/* Setup progress: "n of n steps" + percentage */}
      <div className="mt-3">
        <div className="mb-1.5 flex items-center justify-between">
          <div className="h-3 w-20 animate-pulse rounded bg-muted" />
          <div className="h-3 w-8 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-1.5 w-full animate-pulse rounded-full bg-muted" />
      </div>

      {/* Steps */}
      <div className="mt-3 space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-2.5">
            <div className="size-5 animate-pulse rounded-full bg-muted" />
            <div className="h-4 w-36 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    </Card>
  )
}

export function CardsSkeleton() {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <CardSkeleton />
    </div>
  )
}

export function ActionsSkeleton() {
  return (
    <div className="mt-8">
      {/* "What's next" header */}
      <div className="mb-4 h-4 w-24 animate-pulse rounded bg-muted" />
      <Card size="none">
        <List>
          {[1].map((i) => (
            <div
              key={i}
              className={listRowClassName({ variant: 'embedded', interactive: false })}
            >
              {/* Icon */}
              <div className="size-10 shrink-0 animate-pulse rounded-full bg-muted" />
              {/* Title + description */}
              <div className="min-w-0 flex-1">
                <div className="h-5 w-48 animate-pulse rounded bg-muted" />
                <div className="mt-1.5 h-4 w-36 animate-pulse rounded bg-muted" />
              </div>
              {/* Chevron */}
              <div className="size-4 shrink-0 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </List>
      </Card>
    </div>
  )
}
