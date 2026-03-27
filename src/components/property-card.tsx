'use client'

import { useTranslations } from 'next-intl'
import { ChevronRight, Check, Clock } from 'lucide-react'
import type { PropertySetupProgress, PendingInvite, PropertyOperationalData } from '@/lib/types/property'
import type { MembershipWithProperty } from '@/lib/hooks/use-memberships'

// =============================================================================
// Helpers
// =============================================================================

export function getCompletionSteps(progress: PropertySetupProgress): { label: string; key: string; done: boolean; inProgress: boolean }[] {
  return [
    { label: 'propertyCreated', key: 'property', done: progress.propertyCreated, inProgress: false },
    { label: 'tenantsStep', key: 'tenants', done: progress.tenantsAccepted, inProgress: progress.tenantsInvited && !progress.tenantsAccepted },
    { label: 'chargesStep', key: 'charges', done: progress.chargesConfigured, inProgress: false },
    { label: 'firstStatementStep', key: 'statement', done: progress.firstStatementPublished, inProgress: false },
  ]
}

export function isPropertyComplete(progress: PropertySetupProgress): boolean {
  return getCompletionSteps(progress).every((s) => s.done)
}

export interface StatusBadge {
  /** i18n key under the 'home' namespace */
  labelKey: string
  /** Interpolation params for the i18n key */
  labelParams?: Record<string, number>
  dot: string
  text: string
}

export function getStatusBadge(opData: PropertyOperationalData | undefined): StatusBadge | null {
  if (!opData) return null

  if (opData.unpaidCount > 0) {
    return {
      labelKey: 'statusUnpaid',
      labelParams: { count: opData.unpaidCount },
      dot: 'bg-rose-500',
      text: 'text-rose-600 dark:text-rose-400',
    }
  }

  if (opData.pendingBillCount > 0) {
    return {
      labelKey: 'statusBillsPending',
      labelParams: { count: opData.pendingBillCount },
      dot: 'bg-amber-500',
      text: 'text-amber-600 dark:text-amber-400',
    }
  }

  return {
    labelKey: 'statusAllPaid',
    dot: 'bg-emerald-500',
    text: 'text-emerald-600 dark:text-emerald-400',
  }
}

// =============================================================================
// Operating property card
// =============================================================================

export function OperatingPropertyCard({
  membership,
  opData,
}: {
  membership: MembershipWithProperty
  opData?: PropertyOperationalData
}) {
  const t = useTranslations('home')
  const { property } = membership
  const address = [property.city, property.state].filter(Boolean).join(', ')
  const badge = getStatusBadge(opData)

  return (
    <div className="group block w-full rounded-2xl border border-border bg-card p-5 text-left shadow-sm transition-all hover:border-primary/20 hover:shadow-md dark:bg-zinc-800/80 dark:shadow-none dark:hover:border-primary/30">
      {/* Name + address + chevron */}
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-foreground">{property.name}</h3>
          {address && <p className="mt-0.5 text-sm text-muted-foreground">{address}</p>}
        </div>
        <ChevronRight className="mt-0.5 size-5 shrink-0 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5" />
      </div>

      {/* Revenue + billing cycle */}
      <div className="mt-3 flex items-baseline justify-between">
        {opData ? (
          <p className="text-xl font-bold tabular-nums text-foreground">
            R$ {(opData.expectedRevenueMinor / 100).toLocaleString('pt-BR')}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">{t('noBillingData')}</p>
        )}
        {opData?.billingCycle && (
          <span className="text-sm text-muted-foreground">{opData.billingCycle}</span>
        )}
      </div>

      {/* Status */}
      {badge && (
        <div className="mt-2 flex items-center gap-1.5">
          <div className={`size-1.5 rounded-full ${badge.dot}`} />
          <span className={`text-sm font-medium ${badge.text}`}>{t(badge.labelKey, badge.labelParams)}</span>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Setup property card
// =============================================================================

export function SetupPropertyCard({
  membership,
  progress,
  pendingInvites,
}: {
  membership: MembershipWithProperty
  progress: PropertySetupProgress
  pendingInvites: PendingInvite[]
}) {
  const tP = useTranslations('properties')
  const { property } = membership
  const address = [property.city, property.state].filter(Boolean).join(', ')
  const steps = getCompletionSteps(progress)
  const completed = steps.filter((s) => s.done).length
  const total = steps.length

  return (
    <div className="group block w-full rounded-2xl border border-border bg-card p-5 text-left shadow-sm transition-all hover:border-primary/20 hover:shadow-md dark:bg-zinc-800/80 dark:shadow-none dark:hover:border-primary/30">
      {/* Name + address + chevron */}
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-foreground">{property.name}</h3>
          {address && <p className="mt-0.5 text-sm text-muted-foreground">{address}</p>}
        </div>
        <ChevronRight className="mt-0.5 size-5 shrink-0 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5" />
      </div>

      {/* Progress bar */}
      <div className="mt-3 mb-3">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            {tP('setupSteps', { completed, total })}
          </span>
          <span className="text-xs font-semibold text-primary">
            {Math.round((completed / total) * 100)}%
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-border dark:bg-zinc-700">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${(completed / total) * 100}%` }}
          />
        </div>
      </div>

      {/* Step checklist */}
      <div className="space-y-2">
        {steps.map((step) => (
          <div key={step.key} className="flex items-center gap-2.5">
            {step.done ? (
              <div className="flex size-5 items-center justify-center rounded-full bg-primary/10">
                <Check className="size-3 text-primary" />
              </div>
            ) : step.inProgress ? (
              <div className="flex size-5 items-center justify-center rounded-full bg-amber-500/10">
                <Clock className="size-3 text-amber-500" />
              </div>
            ) : (
              <div className="size-5 rounded-full border border-zinc-300 dark:border-zinc-600" />
            )}
            <span className={`text-sm ${step.done ? 'text-muted-foreground' : step.inProgress ? 'font-medium text-foreground' : 'text-muted-foreground/60'}`}>
              {tP(step.label)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
