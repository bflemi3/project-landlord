import { type ReactNode } from 'react'
import { getLocale, getTranslations } from 'next-intl/server'

import { AmountDisplay } from '@/components/amount-display'
import { EyebrowLabel } from '@/components/eyebrow-label'
import { Alert, AlertBody, AlertDot } from '@/components/ui/alert'
import { formatCurrency } from '@/lib/format'
import { type Locale } from '@/i18n/routing'
import { getPropertyBillsSummary } from '@/data/charges/server'

import { AwaitingInfo } from './awaiting-info'

// Current-month Due · Paid · Awaiting strip + overdue attention banner — the
// locked treatment (2026-06-10).
// Share-primary: the viewer's numbers headline when they hold any bill; the
// property total demotes to a "total · R$X" sub-line. Overdue stays consolidated
// inside Due; the banner calls it out (no action — the overdue rows sort first
// in the ledger directly below, each led by a destructive Dot).
export async function BillsSummary({ propertyId }: { propertyId: string }) {
  const [summary, t, tBills, locale] = await Promise.all([
    getPropertyBillsSummary(propertyId),
    getTranslations('property.summary'),
    getTranslations('property.bills'),
    getLocale() as Promise<Locale>,
  ])

  const sharePrimary = summary.viewer?.hasResponsibility ?? false
  const side = sharePrimary && summary.viewer ? summary.viewer : summary.property
  const { awaiting, currency } = summary
  const money = (minor: number) => formatCurrency(minor, currency, locale, { fractionDigits: 0 })

  return (
    <div className="flex flex-col gap-3">
      {/* The banner keys off the PROPERTY overdue — the viewer always sees it,
          with their own share (or its absence) called out explicitly. */}
      {summary.property.overdueMinor > 0 ? (
        <Alert variant="destructive" size="banner">
          <AlertDot />
          <AlertBody className="truncate">
            {tBills('banner', { amount: money(summary.property.overdueMinor) })}
            {summary.viewer ? (
              <>
                {' · '}
                {summary.viewer.overdueMinor > 0
                  ? tBills('bannerYourShare', { amount: money(summary.viewer.overdueMinor) })
                  : tBills('bannerNoneYours')}
              </>
            ) : null}
          </AlertBody>
        </Alert>
      ) : null}

      <div className="grid grid-cols-3">
        <SummaryStat
          label={t(sharePrimary ? 'dueYours' : 'due')}
          labelTone={sharePrimary ? 'primary' : 'muted'}
        >
          <AmountDisplay
            amountMinor={side.dueMinor}
            currency={currency}
            size="sm"
            fractionDigits={0}
          />
          {sharePrimary && side.dueMinor !== summary.property.dueMinor ? (
            <span className="text-muted-foreground text-sm">
              {t('total')} · {money(summary.property.dueMinor)}
            </span>
          ) : null}
        </SummaryStat>

        <SummaryStat
          label={t(sharePrimary ? 'paidYours' : 'paid')}
          labelTone={sharePrimary ? 'primary' : 'muted'}
        >
          <AmountDisplay
            amountMinor={side.paidMinor}
            currency={currency}
            size="sm"
            fractionDigits={0}
          />
          {sharePrimary && side.paidMinor !== summary.property.paidMinor ? (
            <span className="text-muted-foreground text-sm">
              {t('total')} · {money(summary.property.paidMinor)}
            </span>
          ) : null}
        </SummaryStat>

        <SummaryStat label={t('awaiting')} labelTone="muted" labelAddon={<AwaitingInfo />}>
          {awaiting.count > 0 && awaiting.estimateMinor > 0 ? (
            <AmountDisplay
              amountMinor={awaiting.estimateMinor}
              currency={currency}
              size="sm"
              tone="muted"
              approximate
              fractionDigits={0}
            />
          ) : (
            <span className="text-muted-foreground text-lg font-semibold">
              {awaiting.count > 0 ? t('unknown') : '—'}
            </span>
          )}
          <span className="text-muted-foreground text-sm">
            {t('awaitingBills', { count: awaiting.count })}
          </span>
        </SummaryStat>
      </div>
    </div>
  )
}

function SummaryStat({
  label,
  labelTone,
  labelAddon,
  children,
}: {
  label: string
  labelTone: 'primary' | 'muted'
  children: ReactNode
  labelAddon?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="flex items-center gap-1.5">
        <EyebrowLabel tone={labelTone}>{label}</EyebrowLabel>
        {labelAddon}
      </span>
      {children}
    </div>
  )
}
