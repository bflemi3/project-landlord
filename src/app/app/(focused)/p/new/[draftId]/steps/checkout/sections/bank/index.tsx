'use client'

import { Suspense } from 'react'
import { useTranslations } from 'next-intl'
import { Landmark } from 'lucide-react'

import { BankAccountsPanel } from '@/components/bank-accounts/bank-accounts-panel'
import { BankAccountsPanelSkeleton } from '@/components/bank-accounts/bank-accounts-panel-skeleton'

import type { SectionId } from '../../../../state/registry'
import { useCheckoutContext } from '../../checkout-context'
import { Section } from '../../section'
import { SectionSkeleton } from '../section-skeleton'
import { SummaryRow } from '../summary-row'

const SECTION_ID: SectionId = 'bank'
const ICON = Landmark

// Connecting a bank in the wizard is optional — the per-user bank connection
// surfaces in settings too, so we never block property creation on it. The
// nudge copy below explains why connecting now is useful.
export function isValid(): boolean {
  return true
}

export type BankTouched = ReadonlySet<string>

export function defaultTouched(): BankTouched {
  return new Set()
}

export function setAllTouched(prev: BankTouched): BankTouched {
  return prev
}

export function BankSection() {
  const t = useTranslations('propertyCreation.checkout')
  const { registerHeaderRef } = useCheckoutContext()

  return (
    <Section id={SECTION_ID}>
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
          needsAttentionLabel={t('status.needsAttention')}
          skippedLabel={t('status.skipped')}
          upNextLabel={t('status.upNext')}
        />
      </Section.Header>
      <Section.Body>
        <p className="text-sm text-muted-foreground">{t('bank.nudge')}</p>
        <Suspense fallback={<BankAccountsPanelSkeleton />}>
          <BankAccountsPanel surface="wizard" />
        </Suspense>
        <Section.Actions
          backLabel={t('actions.back')}
          continueLabel={t('actions.continue')}
          skipLabel={t('actions.skip')}
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
