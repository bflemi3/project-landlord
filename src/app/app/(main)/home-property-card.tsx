'use client'

import { useLocale, useTranslations } from 'next-intl'
import { formatCurrency } from '@/lib/format'
import type { Locale } from '@/i18n/routing'
import {
  isPropertyComplete,
  getCompletionSteps,
  PropertyCard,
  PropertyCardHead,
  PropertyCardBody,
  PropertyCardEyebrow,
  PropertyCardTitle,
  PropertyCardSubtitle,
  PropertyCardChevron,
  PropertyCardAmount,
  PropertyCardStatus,
  PropertyCardProgress,
  PropertyCardSteps,
  PropertyCardStep,
} from '@/components/property-card'
import type { HomeProperty } from '@/data/home/shared'
import type { PropertySetupProgress } from '@/lib/types/property'

function deriveSetupProgress(p: HomeProperty): PropertySetupProgress {
  return {
    propertyCreated: true,
    tenantsInvited: p.tenantCount > 0 || p.pendingInviteCount > 0,
    tenantsAccepted: p.tenantCount > 0,
    chargesConfigured: p.chargeCount > 0,
    firstStatementPublished: p.firstStatementPublished ?? false,
  }
}

function formatShortDate(iso: string, locale: Locale): string {
  const intlLocale = locale === 'pt-BR' ? 'pt-BR' : locale === 'es' ? 'es-AR' : 'en-US'
  return new Intl.DateTimeFormat(intlLocale, { month: 'short', day: 'numeric' }).format(new Date(iso))
}

export function HomePropertyCard({ property: p }: { property: HomeProperty }) {
  const tP = useTranslations('properties')
  const t = useTranslations('home')
  const locale = useLocale() as Locale

  const progress = deriveSetupProgress(p)
  const fullySetup = isPropertyComplete(progress)
  const address = [p.city, p.state].filter(Boolean).join(', ')
  const href = `/app/p/${p.propertyId}`

  if (fullySetup) {
    const hasAmount = typeof p.expectedRevenueMinor === 'number' && p.expectedRevenueMinor > 0
    const pendingCount = p.pendingBillCount ?? 0
    const dueDateLabel = p.nextDueDate ? formatShortDate(p.nextDueDate, locale) : null

    return (
      <PropertyCard href={href} size="xl">
        <PropertyCardHead>
          <PropertyCardBody>
            {p.billingCycle && <PropertyCardEyebrow>{p.billingCycle}</PropertyCardEyebrow>}
            <PropertyCardTitle>{p.name}</PropertyCardTitle>
            {address && <PropertyCardSubtitle>{address}</PropertyCardSubtitle>}
          </PropertyCardBody>
          <PropertyCardChevron />
        </PropertyCardHead>

        {hasAmount ? (
          <>
            <PropertyCardAmount>
              {formatCurrency(p.expectedRevenueMinor!, p.currency ?? 'BRL', locale, { fractionDigits: 0 })}
            </PropertyCardAmount>
            {pendingCount > 0 && dueDateLabel ? (
              <PropertyCardStatus tone="muted">
                {t('awaitingBillsWithDueDate', { count: pendingCount, date: dueDateLabel })}
              </PropertyCardStatus>
            ) : (
              <PropertyCardStatus>{t('allPaidThisCycle')}</PropertyCardStatus>
            )}
          </>
        ) : (
          <PropertyCardStatus>{t('noBillingData')}</PropertyCardStatus>
        )}
      </PropertyCard>
    )
  }

  const steps = getCompletionSteps(progress)
  const completed = steps.filter((s) => s.done).length
  const total = steps.length

  return (
    <PropertyCard href={href} size="xl">
      <PropertyCardHead>
        <PropertyCardBody>
          <PropertyCardEyebrow>{tP('gettingStarted')}</PropertyCardEyebrow>
          <PropertyCardTitle>{p.name}</PropertyCardTitle>
          {address && <PropertyCardSubtitle>{address}</PropertyCardSubtitle>}
        </PropertyCardBody>
        <PropertyCardChevron />
      </PropertyCardHead>

      <PropertyCardProgress
        completed={completed}
        total={total}
        label={tP('setupSteps', { completed, total })}
      />

      <PropertyCardSteps>
        {steps.map((step) => (
          <PropertyCardStep
            key={step.key}
            state={step.done ? 'done' : step.inProgress ? 'inProgress' : 'pending'}
          >
            {tP(step.label)}
          </PropertyCardStep>
        ))}
      </PropertyCardSteps>
    </PropertyCard>
  )
}
