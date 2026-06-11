'use client'

import { useFormatter, useTranslations, useLocale } from 'next-intl'

import { AmountDisplay } from '@/components/amount-display'
import { Dot } from '@/components/ui/dot'
import { StatusBadge, type StatusBadgeVariant } from '@/components/status-badge'
import { ListRow, ListRowBody, ListRowTrailing } from '@/components/list-row'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/format'
import { type Locale } from '@/i18n/routing'
import {
  billOutstandingMinor,
  billPaidMinor,
  ledgerBillStatus,
  type AwaitingCharge,
  type Bill,
  type LedgerBillStatus,
} from '@/data/charges/shared'

const STATUS_BADGE: Record<LedgerBillStatus, StatusBadgeVariant> = {
  paid: 'paid',
  due: 'pending',
  overdue: 'overdue',
}

// Noon UTC so the rendered day never shifts across timezones.
const isoToDate = (iso: string) => new Date(`${iso}T12:00:00Z`)

// One discovered bill in the ledger: name + date · amount · status pill.
export function LedgerBillRow({ bill, today }: { bill: Bill; today: string }) {
  const t = useTranslations('property.bills')
  const locale = useLocale() as Locale
  const format = useFormatter()

  const status = ledgerBillStatus(bill, today)
  const paid = billPaidMinor(bill)
  const isPartial = paid > 0 && billOutstandingMinor(bill) > 0
  const rowDate = bill.due_date ?? bill.issued_on

  return (
    <ListRow variant="embedded" interactive={false} className="px-0 py-3">
      <ListRowBody>
        {/* The date is the row's key info (esp. when overdue) — it never
            truncates; a long company name gives way instead. An overdue row
            leads with a destructive Dot, offsetting its title so it breaks
            the column rhythm when scanning. */}
        <span className="flex items-baseline gap-1.5 text-sm">
          {status === 'overdue' ? <Dot tone="destructive" className="self-center" /> : null}
          <span className="text-foreground truncate">{bill.name}</span>
          <span className="text-muted-foreground shrink-0">
            · {format.dateTime(isoToDate(rowDate), { month: 'short', day: 'numeric' })}
          </span>
        </span>
        {isPartial ? (
          <p className={cn('text-muted-foreground mt-0.5 text-sm', status === 'overdue' && 'pl-3')}>
            {t('partialPaid', {
              paid: formatCurrency(paid, bill.currency, locale, { fractionDigits: 0 }),
              total: formatCurrency(bill.amount_minor, bill.currency, locale, {
                fractionDigits: 0,
              }),
            })}
          </p>
        ) : null}
      </ListRowBody>
      <ListRowTrailing className="flex items-center gap-2">
        <AmountDisplay
          amountMinor={bill.amount_minor}
          currency={bill.currency}
          size="xs"
          tone={status === 'paid' ? 'muted' : 'default'}
          fractionDigits={0}
          className="w-22 text-right"
        />
        <span className="flex w-26 justify-end">
          <StatusBadge variant={STATUS_BADGE[status]}>{t(`statuses.${status}`)}</StatusBadge>
        </span>
      </ListRowTrailing>
    </ListRow>
  )
}

// Synthetic expected row — a recurring charge not yet discovered this month.
export function LedgerAwaitingRow({
  charge,
  currency,
}: {
  charge: AwaitingCharge
  currency: string
}) {
  const t = useTranslations('property.bills')
  const tSummary = useTranslations('property.summary')

  return (
    <ListRow variant="embedded" interactive={false} className="px-0 py-3">
      <ListRowBody>
        <p className="text-muted-foreground truncate text-sm">{charge.name}</p>
      </ListRowBody>
      <ListRowTrailing className="flex items-center gap-2">
        {charge.estimateMinor !== null ? (
          <AmountDisplay
            amountMinor={charge.estimateMinor}
            currency={currency}
            size="xs"
            tone="muted"
            approximate
            fractionDigits={0}
            className="w-22 text-right"
          />
        ) : (
          <span className="text-muted-foreground w-22 text-right text-sm">
            {tSummary('unknown')}
          </span>
        )}
        <span className="flex w-26 justify-end">
          <StatusBadge variant="default">{t('statuses.awaiting')}</StatusBadge>
        </span>
      </ListRowTrailing>
    </ListRow>
  )
}
