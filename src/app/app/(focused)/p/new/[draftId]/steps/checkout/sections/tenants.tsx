'use client'

import { useTranslations } from 'next-intl'
import { Users } from 'lucide-react'
import { SectionShell } from './section-shell'
import { SummaryRow } from './summary-row'

export function TenantsSection() {
  const t = useTranslations('propertyCreation.checkout.tenants')
  return (
    <SectionShell
      sectionId="tenants"
      title={t('title')}
      subtitle={t('subtitle')}
      icon={Users}
    >
      <p className="text-sm text-muted-foreground">{t('placeholder')}</p>
    </SectionShell>
  )
}

export function TenantsSummaryRow() {
  const t = useTranslations('propertyCreation.checkout.tenants')
  return <SummaryRow sectionId="tenants" title={t('title')} />
}
