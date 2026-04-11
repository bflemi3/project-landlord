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
      <SetupProgressSkeleton />
      <PropertyInfoSkeleton />
      <TenantsSkeleton />
    </DetailPageLayoutSidebar>
  )
}

export function HeaderSkeleton() {
  return (
    <div className="mb-6">
      {/* Back link */}
      <div className="mb-3 h-4 w-14 animate-pulse rounded bg-muted" />
      {/* Property name */}
      <div className="h-8 w-72 animate-pulse rounded-lg bg-muted" />
      {/* Address */}
      <div className="mt-1.5 h-4 w-52 animate-pulse rounded bg-muted" />
    </div>
  )
}

export function BillingSummarySkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm dark:bg-zinc-800/80 dark:shadow-none">
      {/* Amount + "Tenant owes" */}
      <div className="flex items-baseline gap-2">
        <div className="h-8 w-28 animate-pulse rounded-lg bg-muted" />
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
      </div>
      {/* Payment due */}
      <div className="mt-1.5 h-4 w-52 animate-pulse rounded bg-muted" />

      {/* Action area — statement link or generate button */}
      <div className="mt-4 h-16 w-full animate-pulse rounded-xl bg-muted/50" />
    </div>
  )
}

export function UnitSectionSkeleton() {
  return (
    <div>
      {/* Header: "Charges (n)" + "+ Add" */}
      <div className="mb-3 flex items-center justify-between">
        <div className="h-5 w-24 animate-pulse rounded bg-muted" />
        <div className="h-8 w-16 animate-pulse rounded bg-muted" />
      </div>
      {/* Charge rows */}
      <div className="space-y-1 rounded-2xl border border-border p-1.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-3 border-transparent px-4 py-3.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted" />
            <div className="min-w-0 flex-1">
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              <div className="mt-1.5 h-3 w-32 animate-pulse rounded bg-muted" />
            </div>
            <div className="h-4 w-16 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function SetupProgressSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm dark:bg-zinc-800/80">
      {/* "n of n steps" + percentage */}
      <div className="mb-2 flex items-center justify-between">
        <div className="h-3 w-20 animate-pulse rounded bg-muted" />
        <div className="h-3 w-8 animate-pulse rounded bg-muted" />
      </div>
      {/* Progress bar */}
      <div className="mb-4 h-1.5 w-full animate-pulse rounded-full bg-muted" />
      {/* Steps */}
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-2.5">
            <div className="size-5 animate-pulse rounded-full bg-muted" />
            <div className="h-4 w-36 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  )
}

function PropertyInfoSkeleton() {
  return (
    <div>
      {/* Header: "Property info" + "Edit" */}
      <div className="mb-3 flex items-center justify-between">
        <div className="h-5 w-24 animate-pulse rounded bg-muted" />
        <div className="h-8 w-14 animate-pulse rounded bg-muted" />
      </div>
      {/* Address card */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm dark:bg-zinc-800/80 dark:shadow-none">
        <div className="flex gap-3">
          <div className="size-4 shrink-0 animate-pulse rounded bg-muted" />
          <div className="space-y-1.5">
            <div className="h-4 w-44 animate-pulse rounded bg-muted" />
            <div className="h-4 w-28 animate-pulse rounded bg-muted" />
            <div className="h-4 w-20 animate-pulse rounded bg-muted" />
            <div className="h-4 w-36 animate-pulse rounded bg-muted" />
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          </div>
        </div>
      </div>
    </div>
  )
}

export function TenantsSkeleton() {
  return (
    <div>
      {/* Header: "Tenants (n)" + "+ Invite" */}
      <div className="mb-3 flex items-center justify-between">
        <div className="h-5 w-24 animate-pulse rounded bg-muted" />
        <div className="h-8 w-18 animate-pulse rounded bg-muted" />
      </div>
      {/* Tenant rows */}
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl border border-border px-4 py-3 dark:border-zinc-700">
            <div className="size-8 animate-pulse rounded-full bg-muted" />
            <div className="min-w-0 flex-1">
              <div className="h-4 w-32 animate-pulse rounded bg-muted" />
              <div className="mt-1 h-3 w-48 animate-pulse rounded bg-muted" />
            </div>
            <div className="h-4 w-14 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  )
}
