'use client'

import { Accordion as AccordionPrimitive } from '@base-ui/react/accordion'
import { useTranslations } from 'next-intl'
import { AlertCircle, Check, Trash2 } from 'lucide-react'

import { AccordionContent, AccordionItem } from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { TenantFormAvatar } from '@/components/forms/tenant-form'

import type { PropertyInput } from '@/schemas/property'

import { type TenantRow as TenantRowType } from './schemas'
import { usePropertyCreationState } from '../../../../state/use-property-creation'
import { TenantForm } from './tenant-form'
import { AutoFilledIcon } from '../auto-filled-indicator'
import { RowTrailingStatus } from '../row-trailing-status'
import { type TenantsTouched } from './state'
import { validateTenants } from './validation'

interface TenantRowProps {
  id: string
  isRemoving: boolean
  autoFocus: boolean
  /** Forwarded to the underlying AccordionItem so just-added rows fade in. */
  animateEntrance?: boolean
  onRemove: () => void
}

export function TenantRow({
  id,
  isRemoving,
  autoFocus,
  animateEntrance,
  onRemove,
}: TenantRowProps) {
  const t = useTranslations('propertyCreation.checkout.tenants')

  // Subscribe to the row reference only — `find()` keeps a stable ref while
  // this row's data is unchanged, so unrelated row edits don't re-render us.
  const tenant = usePropertyCreationState((s) =>
    (s.sectionData.tenants as TenantRowType[]).find((row) => row.id === id),
  )
  const isTouched = usePropertyCreationState(
    (s) =>
      ((s.sectionTouched.tenants as TenantsTouched)[id]?.size ?? 0) > 0,
  )

  // Validity selector reads the cache inside the selector and returns a
  // boolean — Zustand only re-renders when the boolean flips. Cache hit
  // is O(1) so the selector cost is dominated by `Object.is` on the result.
  // The "Needs attention" badge below gates on (isTouched || !isValid) so
  // a freshly-added empty row doesn't yell before the user has interacted.
  const isValid = usePropertyCreationState((s) => {
    const tenants = s.sectionData.tenants as TenantRowType[]
    const country = (s.sectionData.property as PropertyInput).country_code
    return validateTenants(tenants, country).perRow.get(id)?.success ?? true
  })

  if (!tenant) return null

  const primary = tenant.name || tenant.email || t('newTenant')
  const secondary = tenant.email && tenant.email !== primary ? tenant.email : null

  return (
    <AccordionItem
      value={id}
      isRemoving={isRemoving}
      animateEntrance={animateEntrance}
      data-slot="tenant-row"
    >
      <AccordionPrimitive.Header className="flex w-full min-w-0 items-center gap-2">
        <AccordionPrimitive.Trigger
          data-slot="tenant-row-trigger"
          className="focus-visible:ring-ring/50 flex min-w-0 flex-1 items-center gap-4 rounded-lg py-3 text-left outline-none focus-visible:ring-3"
        >
          <div className="relative shrink-0">
            <TenantFormAvatar name={tenant.name} email={tenant.email} />
            {tenant.isExtracted && (
              <span
                className="bg-card ring-card absolute -top-1 -right-1 z-10 inline-flex size-4 items-center justify-center rounded-full ring-2"
                aria-hidden
              >
                <AutoFilledIcon />
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
          <SummaryStatus
            showInvalid={!isValid && isTouched}
            inviteNow={tenant.inviteNow}
          />
        </AccordionPrimitive.Trigger>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          aria-label={t('removeAriaLabel')}
          className="hover:not-disabled:bg-destructive/10 hover:not-disabled:text-destructive"
        >
          <Trash2 />
        </Button>
      </AccordionPrimitive.Header>
      {/* `p-4` gives the form symmetric breathing room and an x-inset that
          reads as "body of this row" — matches the expense row's treatment. */}
      <AccordionContent className="p-4">
        <TenantForm id={id} autoFocus={autoFocus} />
      </AccordionContent>
    </AccordionItem>
  )
}

function SummaryStatus({
  showInvalid,
  inviteNow,
}: {
  showInvalid: boolean
  inviteNow: boolean
}) {
  const t = useTranslations('propertyCreation.checkout.tenants')

  if (showInvalid) {
    return (
      <RowTrailingStatus icon={AlertCircle} tone="destructive">
        {t('summaryNeedsAttention')}
      </RowTrailingStatus>
    )
  }
  if (inviteNow) {
    return (
      <RowTrailingStatus icon={Check} tone="primary">
        {t('summaryWillInvite')}
      </RowTrailingStatus>
    )
  }
  return (
    <RowTrailingStatus tone="muted">{t('summaryNoInvite')}</RowTrailingStatus>
  )
}
