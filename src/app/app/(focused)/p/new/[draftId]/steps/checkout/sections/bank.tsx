'use client'

import { useTranslations } from 'next-intl'
import { Landmark } from 'lucide-react'

import type { SectionId } from '../../../state/registry'
import { useCheckoutContext } from '../checkout-context'
import { Section } from '../section'
import { useSectionController } from '../use-section-controller'
import { SectionSkeleton } from './section-skeleton'
import { SummaryRow } from './summary-row'

const SECTION_ID: SectionId = 'bank'
const ICON = Landmark

export function BankSection() {
  const t = useTranslations('propertyCreation.checkout')
  const { registerHeaderRef } = useCheckoutContext()
  const ctrl = useSectionController(SECTION_ID)

  return (
    <Section
      id={SECTION_ID}
      isActive={ctrl.isActive}
      isUpNext={ctrl.isUpNext}
      status={ctrl.status}
    >
      <Section.Header ref={registerHeaderRef(SECTION_ID)}>
        <Section.Icon>
          <ICON />
        </Section.Icon>
        <Section.HeaderContent>
          <Section.Title>{t('bank.title')}</Section.Title>
          <Section.Subtitle>{t('bank.subtitle')}</Section.Subtitle>
        </Section.HeaderContent>
        <Section.Status
          doneLabel={t('status.done')}
          skippedLabel={t('status.skipped')}
          upNextLabel={t('status.upNext')}
        />
      </Section.Header>
      <Section.Body>
        <p className="text-muted-foreground">{t('bank.placeholder')}</p>
        <Section.Actions
          backLabel={t('actions.back')}
          continueLabel={t('actions.continue')}
          skipLabel={t('actions.skip')}
          showSkip={!ctrl.isRequired}
          onBack={ctrl.handleBack}
          onContinue={ctrl.handleContinue}
          onSkip={ctrl.handleSkip}
        />
      </Section.Body>
    </Section>
  )
}

export function BankSectionSkeleton() {
  return <SectionSkeleton sectionId={SECTION_ID} icon={ICON} />
}

export function BankSummaryRow() {
  const t = useTranslations('propertyCreation.checkout.bank')
  return <SummaryRow sectionId={SECTION_ID} title={t('title')} />
}
