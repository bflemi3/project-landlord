'use client'

import { useTranslations } from 'next-intl'
import { CalendarDays } from 'lucide-react'
import { SectionShell } from './section-shell'
import { SummaryRow } from './summary-row'

export function RentDatesSection() {
  const t = useTranslations('propertyCreation.checkout.rent-dates')
  return (
    <SectionShell
      sectionId="rent-dates"
      title={t('title')}
      subtitle={t('subtitle')}
      icon={CalendarDays}
    >
      <p className="text-sm text-muted-foreground">{t('placeholder')}</p>
    </SectionShell>
  )
}

export function RentDatesSummaryRow() {
  const t = useTranslations('propertyCreation.checkout.rent-dates')
  return <SummaryRow sectionId="rent-dates" title={t('title')} />
}
