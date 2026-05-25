import { getLocale, getTranslations } from 'next-intl/server'
import { AlertCircle } from 'lucide-react'
import { getLandlordHomeRevenueSummary } from '@/data/landlord-home/server'
import { getLandlordHomePropertyCards } from '@/data/landlord-home/server'
import type { Locale } from '@/i18n/routing'
import { formatCurrency } from '@/lib/format'
import { Card } from '@/components/ui/card'
import { EyebrowLabel } from '@/components/eyebrow-label'
import { LandlordHomeAnalytics } from './landlord-home-analytics'

const FALLBACK_CURRENCY = 'BRL'

export async function RevenueSummarySection() {
  const [summary, cards, locale, t] = await Promise.all([
    getLandlordHomeRevenueSummary(),
    getLandlordHomePropertyCards(),
    getLocale() as Promise<Locale>,
    getTranslations('landlordHome'),
  ])

  const earnedCurrencies = Object.keys(summary.total_earned_minor)
  const monthlyCurrencies = Object.keys(summary.total_monthly_minor)
  const displayCurrency =
    earnedCurrencies[0] ?? monthlyCurrencies[0] ?? FALLBACK_CURRENCY

  const earnedMinor = summary.total_earned_minor[displayCurrency] ?? null
  const monthlyMinor = summary.total_monthly_minor[displayCurrency] ?? null

  const earnedLabel =
    earnedMinor === null
      ? '—'
      : formatCurrency(earnedMinor, displayCurrency, locale, { fractionDigits: 0 })
  const monthlyLabel =
    monthlyMinor === null
      ? '—'
      : formatCurrency(monthlyMinor, displayCurrency, locale, { fractionDigits: 0 })

  const propertiesCount = cards.length
  const activeLeasesCount = cards.filter((c) => c.monthly_minor !== null).length

  const endingSoonCount = summary.ending_soon.length
  const endingSoonNames = summary.ending_soon
    .map((entry) => entry.property_name)
    .join(' · ')

  return (
    <>
      <LandlordHomeAnalytics endingSoonCount={endingSoonCount} />

      <Card size="lg" className="mb-3 overflow-hidden p-0">
        <div className="grid sm:grid-cols-2">
          <SummaryStat
            eyebrow={t('totalEarned')}
            value={earnedLabel}
            sub={t('acrossProperties', { count: propertiesCount })}
            emphasize
          />
          <div className="border-t border-border sm:border-t-0 sm:border-l">
            <SummaryStat
              eyebrow={t('expectedMonthly')}
              value={monthlyLabel}
              sub={t('activeLeases', { count: activeLeasesCount })}
            />
          </div>
        </div>
      </Card>

      {endingSoonCount > 0 ? (
        <Card
          size="sm"
          className="mb-6 flex items-start gap-3 border-warning-subtle bg-warning-subtle/40 px-4 py-3"
        >
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-warning-subtle text-warning-subtle-foreground">
            <AlertCircle className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-warning-subtle-foreground">
              {t('endingSoonCount', { count: endingSoonCount })}
            </p>
            <p className="mt-0.5 truncate text-sm text-foreground/70">{endingSoonNames}</p>
          </div>
        </Card>
      ) : (
        <div className="mb-6" />
      )}
    </>
  )
}

function SummaryStat({
  eyebrow,
  value,
  sub,
  emphasize = false,
}: {
  eyebrow: string
  value: string
  sub: string
  emphasize?: boolean
}) {
  return (
    <div className="px-5 py-5 sm:px-6 sm:py-7">
      <EyebrowLabel tone="muted">{eyebrow}</EyebrowLabel>
      <p
        className={`mt-2 text-3xl tabular-nums sm:mt-3 sm:text-4xl ${
          emphasize
            ? 'font-display font-medium tracking-[-0.015em] text-primary-subtle-foreground'
            : 'font-mono font-medium text-foreground'
        }`}
      >
        {value}
      </p>
      <p className="mt-1 text-sm text-muted-foreground sm:mt-2">{sub}</p>
    </div>
  )
}
