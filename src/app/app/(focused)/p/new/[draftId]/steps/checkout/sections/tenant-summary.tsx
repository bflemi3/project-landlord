'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { AlertCircle, Check, Sparkles } from 'lucide-react'

import { TenantFormAvatar, TenantFormRemoveButton } from '@/components/forms/tenant-form'

import type { PropertyInput } from '../../../state/extraction-seeding'
import {
  getTenantRowSchema,
  type TenantRow,
} from '../../../state/tenant-row-schema'
import { usePropertyCreationState } from '../../../state/use-property-creation'

interface TenantSummaryProps {
  id: string
  onActivate: () => void
  onRemove: () => void
}

export function TenantSummary({ id, onActivate, onRemove }: TenantSummaryProps) {
  const t = useTranslations('propertyCreation.checkout.tenants')

  const tenant = usePropertyCreationState((s) =>
    (s.sectionData.tenants as TenantRow[]).find((row) => row.id === id),
  )
  const countryCode = usePropertyCreationState(
    (s) => (s.sectionData.property as PropertyInput).country_code,
  )

  // Schema parse without touch tracking — surfaces every error the row would
  // ever throw, not just touched ones. Drives the "Needs attention" hint.
  const isValid = useMemo(() => {
    if (!tenant) return true
    return getTenantRowSchema(countryCode).safeParse(tenant).success
  }, [tenant, countryCode])

  if (!tenant) return null

  const primary = tenant.name || tenant.email || t('newTenant')
  const secondary = tenant.email && tenant.email !== primary ? tenant.email : null

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={onActivate}
        className="focus-visible:ring-ring/50 -m-2 flex flex-1 items-center gap-4 rounded-lg p-2 text-left outline-none focus-visible:ring-3"
      >
        <div className="relative shrink-0">
          <TenantFormAvatar name={tenant.name} email={tenant.email} />
          {tenant.isExtracted && (
            <span
              className="bg-card ring-card absolute -top-1 -right-1 z-10 inline-flex size-4 items-center justify-center rounded-full ring-2"
              aria-hidden
            >
              <Sparkles className="text-primary size-3" />
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-foreground truncate text-sm font-medium">
            {primary}
          </p>
          {secondary && (
            <p className="text-muted-foreground truncate text-xs">{secondary}</p>
          )}
        </div>
      </button>
      <SummaryStatus isValid={isValid} inviteNow={tenant.inviteNow} />
      <TenantFormRemoveButton
        aria-label={t('removeAriaLabel')}
        onClick={onRemove}
      />
    </div>
  )
}

function SummaryStatus({
  isValid,
  inviteNow,
}: {
  isValid: boolean
  inviteNow: boolean
}) {
  const t = useTranslations('propertyCreation.checkout.tenants')

  if (!isValid) {
    return (
      <div className="flex shrink-0 items-center gap-1.5">
        <AlertCircle className="text-destructive size-3" />
        <span className="text-destructive text-xs">
          {t('summaryNeedsAttention')}
        </span>
      </div>
    )
  }
  if (inviteNow) {
    return (
      <div className="flex shrink-0 items-center gap-1.5">
        <Check className="text-primary size-3" />
        <span className="text-primary text-xs">{t('summaryWillInvite')}</span>
      </div>
    )
  }
  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <span className="text-muted-foreground text-xs">
        {t('summaryNoInvite')}
      </span>
    </div>
  )
}
