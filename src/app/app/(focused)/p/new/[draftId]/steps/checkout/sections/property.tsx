'use client'

import { useTranslations } from 'next-intl'
import { Building2 } from 'lucide-react'
import { SectionShell } from './section-shell'
import { SummaryRow } from './summary-row'

export function PropertySection() {
  const t = useTranslations('propertyCreation.checkout.property')
  return (
    <SectionShell
      sectionId="property"
      title={t('title')}
      subtitle={t('subtitle')}
      icon={Building2}
    >
      <p className="text-sm text-muted-foreground">{t('placeholder')}</p>
    </SectionShell>
  )
}

export function PropertySummaryRow() {
  const t = useTranslations('propertyCreation.checkout.property')
  return <SummaryRow sectionId="property" title={t('title')} />
}
