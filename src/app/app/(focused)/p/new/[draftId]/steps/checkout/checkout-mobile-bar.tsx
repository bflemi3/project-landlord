'use client'

import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { StickyBottomBar } from '@/components/sticky-bottom-bar'
import { CHECKOUT_SECTIONS } from '../../state/registry'
import { usePropertyCreationState } from '../../state/use-property-creation'
import { getRemainingSectionCount } from '../../state/derivations'

interface CheckoutMobileBarProps {
  className?: string
}

export function CheckoutMobileBar({ className }: CheckoutMobileBarProps) {
  const t = useTranslations('propertyCreation.checkout.cta')
  const sectionStates = usePropertyCreationState((s) => s.sectionStates)
  const activeSectionId = usePropertyCreationState((s) => s.activeSectionId)
  const remaining = usePropertyCreationState((s) =>
    getRemainingSectionCount({ sectionStates: s.sectionStates }),
  )

  return (
    <StickyBottomBar data-slot="checkout-mobile-bar" className={className}>
      <div className="mb-2 flex items-center justify-center gap-2">
        {CHECKOUT_SECTIONS.map((section) => {
          const status = sectionStates[section.id]
          const dotClass =
            status === 'completed'
              ? 'size-2 rounded-full bg-success'
              : status === 'skipped'
                ? 'size-2 rounded-full bg-secondary'
                : section.id === activeSectionId
                  ? 'size-2 rounded-full bg-primary'
                  : 'size-2 rounded-full bg-muted'
          return (
            <span
              key={section.id}
              data-status={status}
              className={dotClass}
            />
          )
        })}
      </div>
      {remaining > 0 && (
        <p
          data-slot="checkout-mobile-bar-remaining"
          className="mb-3 text-center text-sm text-muted-foreground"
        >
          {t('remaining', { count: remaining })}
        </p>
      )}
      <Button className="w-full" disabled={remaining > 0}>
        {t('create')}
      </Button>
    </StickyBottomBar>
  )
}
