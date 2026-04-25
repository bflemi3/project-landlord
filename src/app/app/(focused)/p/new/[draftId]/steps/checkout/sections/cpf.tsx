'use client'

import { useTranslations } from 'next-intl'
import { CreditCard } from 'lucide-react'
import { SectionShell } from './section-shell'
import { SummaryRow } from './summary-row'

export function CpfSection() {
  const t = useTranslations('propertyCreation.checkout.cpf')
  return (
    <SectionShell
      sectionId="cpf"
      title={t('title')}
      subtitle={t('subtitle')}
      icon={CreditCard}
    >
      <p className="text-sm text-muted-foreground">{t('placeholder')}</p>
    </SectionShell>
  )
}

export function CpfSummaryRow() {
  const t = useTranslations('propertyCreation.checkout.cpf')
  return <SummaryRow sectionId="cpf" title={t('title')} />
}
