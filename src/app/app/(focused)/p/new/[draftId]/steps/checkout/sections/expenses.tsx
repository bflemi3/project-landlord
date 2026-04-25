'use client'

import { useTranslations } from 'next-intl'
import { Receipt } from 'lucide-react'
import { SectionShell } from './section-shell'
import { SummaryRow } from './summary-row'

export function ExpensesSection() {
  const t = useTranslations('propertyCreation.checkout.expenses')
  return (
    <SectionShell
      sectionId="expenses"
      title={t('title')}
      subtitle={t('subtitle')}
      icon={Receipt}
    >
      <p className="text-sm text-muted-foreground">{t('placeholder')}</p>
    </SectionShell>
  )
}

export function ExpensesSummaryRow() {
  const t = useTranslations('propertyCreation.checkout.expenses')
  return <SummaryRow sectionId="expenses" title={t('title')} />
}
