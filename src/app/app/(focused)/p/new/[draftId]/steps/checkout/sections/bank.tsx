'use client'

import { useTranslations } from 'next-intl'
import { Landmark } from 'lucide-react'
import { SectionShell } from './section-shell'
import { SummaryRow } from './summary-row'

export function BankSection() {
  const t = useTranslations('propertyCreation.checkout.bank')
  return (
    <SectionShell
      sectionId="bank"
      title={t('title')}
      subtitle={t('subtitle')}
      icon={Landmark}
    >
      <p className="text-sm text-muted-foreground">{t('placeholder')}</p>
    </SectionShell>
  )
}

export function BankSummaryRow() {
  const t = useTranslations('propertyCreation.checkout.bank')
  return <SummaryRow sectionId="bank" title={t('title')} />
}
