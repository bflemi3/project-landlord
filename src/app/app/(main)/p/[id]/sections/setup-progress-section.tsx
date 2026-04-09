'use client'

import { useTranslations } from 'next-intl'
import { Check, Clock } from 'lucide-react'
import { getCompletionSteps, isPropertyComplete } from '@/components/property-card'
import { useProperty } from '@/data/properties/client'
import { useUnitCharges, useUnitTenants, useUnitInvites } from '@/data/units/client'

export function SetupProgressSection({ propertyId }: { propertyId: string }) {
  const tP = useTranslations('properties')
  const { data: property } = useProperty(propertyId)

  // For setup progress, check the first unit (MVP: single unit per property)
  const firstUnitId = property.unitIds[0] ?? ''
  const { data: charges } = useUnitCharges(firstUnitId)
  const { data: members } = useUnitTenants(firstUnitId)
  const { data: invites } = useUnitInvites(firstUnitId)

  const activeTenants = members.length
  const pendingInvites = invites.length

  const progress = {
    propertyCreated: true,
    tenantsInvited: activeTenants > 0 || pendingInvites > 0,
    tenantsAccepted: activeTenants > 0,
    chargesConfigured: charges.length > 0,
    firstStatementPublished: false,
  }

  if (isPropertyComplete(progress)) return null

  const steps = getCompletionSteps(progress)
  const completed = steps.filter((s) => s.done).length
  const total = steps.length

  return (
    <div>
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm dark:bg-zinc-800/80">
        <div className="mb-3">
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
    </div>
  )
}
