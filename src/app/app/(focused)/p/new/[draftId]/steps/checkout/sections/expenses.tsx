'use client'

import { useTranslations } from 'next-intl'
import { Receipt } from 'lucide-react'

import type { SectionId } from '../../../state/registry'
import { useCheckoutContext } from '../checkout-context'
import { Section } from '../section'
import { useSectionController } from '../use-section-controller'
import { SectionSkeleton } from './section-skeleton'
import { SummaryRow } from './summary-row'

const SECTION_ID: SectionId = 'expenses'
const ICON = Receipt

export function ExpensesSection() {
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
          <Section.Title>{t('expenses.title')}</Section.Title>
          <Section.Subtitle>{t('expenses.subtitle')}</Section.Subtitle>
        </Section.HeaderContent>
        <Section.Status
          doneLabel={t('status.done')}
          skippedLabel={t('status.skipped')}
          upNextLabel={t('status.upNext')}
        />
      </Section.Header>
      <Section.Body>
        <p className="text-muted-foreground">{t('expenses.placeholder')}</p>
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

export function ExpensesSectionSkeleton() {
  return <SectionSkeleton sectionId={SECTION_ID} icon={ICON} />
}

export function ExpensesSummaryRow() {
  const t = useTranslations('propertyCreation.checkout.expenses')
  return <SummaryRow sectionId={SECTION_ID} title={t('title')} />
}
