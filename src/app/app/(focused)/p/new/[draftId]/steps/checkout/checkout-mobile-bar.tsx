'use client'

import { useTranslations } from 'next-intl'
import { useShallow } from 'zustand/react/shallow'

import { Button } from '@/components/ui/button'
import { Dot } from '@/components/ui/dot'
import { StickyBottomBar } from '@/components/sticky-bottom-bar'
import { CHECKOUT_SECTIONS } from '../../state/registry'
import { deriveAllSectionValidities, type SectionValidity } from '../../state/section-validity'
import { usePropertyCreationState } from '../../state/use-property-creation'
import { getRemainingSectionCount } from '../../state/derivations'
import { useCheckoutContext } from './checkout-context'

interface CheckoutMobileBarProps {
  className?: string
}

const dotClasses: Record<SectionValidity, string> = {
  completed: 'bg-success',
  skipped: 'bg-secondary',
  upcoming: 'bg-muted',
  invalid: 'bg-destructive',
}

export function CheckoutMobileBar({ className }: CheckoutMobileBarProps) {
  const t = useTranslations('propertyCreation.checkout.cta')
  const activeSectionId = usePropertyCreationState((s) => s.activeSectionId)
  const validities = usePropertyCreationState(useShallow(deriveAllSectionValidities))
  const hasInvalidSection = Object.values(validities).some((v) => v === 'invalid')
  const remaining = usePropertyCreationState((s) =>
    getRemainingSectionCount({ sectionStates: s.sectionStates }),
  )
  const { onCreateProperty, isSubmitting } = useCheckoutContext()

  return (
    <StickyBottomBar data-slot="checkout-mobile-bar" className={className}>
      <div className="mb-2 flex items-center justify-center gap-2">
        {CHECKOUT_SECTIONS.map((section) => {
          const validity = validities[section.id]
          const dotClass = section.id === activeSectionId ? 'bg-primary' : dotClasses[validity]
          return <Dot key={section.id} size="md" data-status={validity} className={dotClass} />
        })}
      </div>
      {remaining > 0 && (
        <p
          data-slot="checkout-mobile-bar-remaining"
          className="text-muted-foreground mb-3 text-center text-sm"
        >
          {t('remaining', { count: remaining })}
        </p>
      )}
      <Button
        className="w-full"
        disabled={remaining > 0 || hasInvalidSection || isSubmitting}
        onClick={onCreateProperty}
      >
        {isSubmitting ? t('creating') : t('create')}
      </Button>
    </StickyBottomBar>
  )
}
