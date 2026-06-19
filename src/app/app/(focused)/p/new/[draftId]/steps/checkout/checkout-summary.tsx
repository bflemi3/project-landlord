'use client'

import { useTranslations } from 'next-intl'

import { useShallow } from 'zustand/react/shallow'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { CHECKOUT_SECTIONS } from '../../state/registry'
import { getRemainingSectionCount } from '../../state/derivations'
import { deriveAllSectionValidities } from '../../state/section-validity'
import { usePropertyCreationState } from '../../state/use-property-creation'
import { useCheckoutContext } from './checkout-context'
import { PropertySummaryRow } from './sections/property'
import { RentDatesSummaryRow } from './sections/rent-dates'
import { TenantsSummaryRow } from './sections/tenants'
import { ExpensesSummaryRow } from './sections/expenses'
import { TaxIdSummaryRow } from './sections/tax-id'
import { BankSummaryRow } from './sections/bank'

interface CheckoutSummaryProps {
  className?: string
}

const TOTAL_SECTIONS = CHECKOUT_SECTIONS.length

export function CheckoutSummary({ className }: CheckoutSummaryProps) {
  const t = useTranslations('propertyCreation.checkout')
  const remaining = usePropertyCreationState((s) =>
    getRemainingSectionCount({ sectionStates: s.sectionStates }),
  )
  const hasInvalidSection = usePropertyCreationState(
    useShallow((s) => Object.values(deriveAllSectionValidities(s)).some((v) => v === 'invalid')),
  )
  const { onCreateProperty, isSubmitting } = useCheckoutContext()

  return (
    <aside
      data-slot="checkout-summary"
      className={cn(
        'rounded-card dark:border-border bg-card flex flex-col gap-6 border border-transparent p-6 shadow-lg dark:shadow-none',
        className,
      )}
    >
      <div data-slot="checkout-summary-header">
        <h2 className="text-foreground text-base font-semibold">{t('summary.title')}</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          {t('summary.remaining', {
            count: remaining,
            total: TOTAL_SECTIONS,
          })}
        </p>
      </div>
      <ul className="space-y-3">
        <PropertySummaryRow />
        <RentDatesSummaryRow />
        <TenantsSummaryRow />
        <ExpensesSummaryRow />
        <TaxIdSummaryRow />
        <BankSummaryRow />
      </ul>
      <Button
        className="mt-6 w-full"
        disabled={remaining > 0 || hasInvalidSection || isSubmitting}
        onClick={onCreateProperty}
      >
        {isSubmitting ? t('cta.creating') : t('cta.create')}
      </Button>
      {(remaining > 0 || hasInvalidSection) && (
        <p className="text-muted-foreground -mt-3 text-center text-sm">{t('cta.hint')}</p>
      )}
    </aside>
  )
}
