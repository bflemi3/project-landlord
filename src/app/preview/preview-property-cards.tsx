'use client'

import { useTranslations } from 'next-intl'
import { ChevronRight, Check, Clock } from 'lucide-react'
import { getCompletionSteps, getStatusBadge } from '@/components/property-card'
import type { PropertySetupProgress, PendingInvite, PropertyOperationalData } from '@/lib/types/property'
import type { PreviewMembership } from './mock-data'

/**
 * Preview-only property cards — accept mock data as props.
 * The real app uses HomePropertyCard in home-content.tsx which derives from useHomeProperties.
 */

export function PreviewOperatingCard({
  membership,
  opData,
}: {
  membership: PreviewMembership
  opData?: PropertyOperationalData
}) {
  const t = useTranslations('home')
  const { property } = membership
  const address = [property.city, property.state].filter(Boolean).join(', ')
  const badge = getStatusBadge(opData)

  return (
    <div className="group block w-full rounded-2xl border border-border bg-card p-5 text-left shadow-sm transition-all hover:border-primary/20 hover:shadow-md dark:bg-zinc-800/80 dark:shadow-none dark:hover:border-primary/30">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-foreground">{property.name}</h3>
          {address && <p className="mt-0.5 text-sm text-muted-foreground">{address}</p>}
        </div>
        <ChevronRight className="mt-0.5 size-5 shrink-0 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5" />
      </div>

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

      {badge && (
        <div className="mt-2 flex items-center gap-1.5">
          <div className={`size-1.5 rounded-full ${badge.dot}`} />
          <span className={`text-sm font-medium ${badge.text}`}>{t(badge.labelKey, badge.labelParams)}</span>
        </div>
      )}
    </div>
  )
}

export function PreviewSetupCard({
  membership,
  progress,
}: {
  membership: PreviewMembership
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
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-foreground">{property.name}</h3>
          {address && <p className="mt-0.5 text-sm text-muted-foreground">{address}</p>}
        </div>
        <ChevronRight className="mt-0.5 size-5 shrink-0 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5" />
      </div>

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
