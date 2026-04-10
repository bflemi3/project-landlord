import { DetailPageLayoutMain, DetailPageLayoutSidebar } from '@/components/detail-page-layout'

/**
 * Skeleton fallbacks for Suspense boundaries on the property detail page.
 * Each skeleton structurally matches its resolved content to prevent layout shift.
 */

export function MainColumnSkeleton() {
  return (
    <DetailPageLayoutMain>
      <BillingSummarySkeleton />
      <UnitSectionSkeleton />
    </DetailPageLayoutMain>
  )
}

export function SidebarSkeleton() {
  return (
    <DetailPageLayoutSidebar>
      <div className="hidden md:block">
        <SetupProgressSkeleton />
      </div>
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm dark:bg-zinc-800/80">
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        <div className="mt-3 space-y-2">
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
          <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
        </div>
      </div>
      <TenantsSkeleton />
    </DetailPageLayoutSidebar>
  )
}

export function HeaderSkeleton() {
  return (
    <div className="mb-6">
      <div className="mb-3 h-4 w-12 animate-pulse rounded bg-muted" />
      <div className="h-8 w-56 animate-pulse rounded-lg bg-muted" />
      <div className="mt-1.5 h-4 w-40 animate-pulse rounded bg-muted" />
    </div>
  )
}

export function BillingSummarySkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm dark:bg-zinc-800/80 dark:shadow-none">
      {/* Amount + label */}
      <div className="flex items-baseline gap-2">
        <div className="h-7 w-28 animate-pulse rounded-lg bg-muted" />
        <div className="h-4 w-20 animate-pulse rounded bg-muted" />
      </div>
      {/* Due day */}
      <div className="mt-1.5 h-4 w-44 animate-pulse rounded bg-muted" />

      {/* Action area — matches generate button height */}
      <div className="mt-4 h-10 w-full animate-pulse rounded-xl bg-muted" />
    </div>
  )
}

export function UnitSectionSkeleton() {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="h-5 w-24 animate-pulse rounded bg-muted" />
        <div className="h-8 w-24 animate-pulse rounded bg-muted" />
      </div>
      <div className="space-y-1 rounded-2xl border border-border p-1.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl border-transparent px-4 py-3.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="h-4 w-28 animate-pulse rounded bg-muted" />
              <div className="h-3 w-36 animate-pulse rounded bg-muted" />
            </div>
            <div className="h-4 w-16 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function TenantsSkeleton() {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="h-5 w-20 animate-pulse rounded bg-muted" />
        <div className="h-8 w-20 animate-pulse rounded bg-muted" />
      </div>
      <div className="space-y-2">
        {[1].map((i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl border border-border px-4 py-3 dark:border-zinc-700">
            <div className="size-8 animate-pulse rounded-full bg-muted" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-28 animate-pulse rounded bg-muted" />
              <div className="h-3 w-36 animate-pulse rounded bg-muted" />
            </div>
            <div className="h-4 w-12 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function SetupProgressSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm dark:bg-zinc-800/80">
      <div className="mb-3">
        <div className="mb-1.5 flex items-center justify-between">
          <div className="h-3 w-20 animate-pulse rounded bg-muted" />
          <div className="h-3 w-8 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-1.5 w-full animate-pulse rounded-full bg-muted" />
      </div>
      <div className="space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-2.5">
            <div className="size-5 animate-pulse rounded-full bg-muted" />
            <div className="h-4 w-32 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  )
}
