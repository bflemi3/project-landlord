import { getFormatter, getTranslations } from 'next-intl/server'
import { Receipt } from 'lucide-react'

import { List } from '@/components/list-row'
import { SectionLabel } from '@/components/section-label'
import {
  EmptyState,
  EmptyStateDescription,
  EmptyStateIcon,
  EmptyStateTitle,
} from '@/components/empty-state'
import { getPropertyBillsSummary, getPropertyLedger } from '@/data/charges/server'
import { monthStartISO } from '@/data/charges/shared'

import { LedgerAwaitingRow, LedgerBillRow } from './ledger-row'
import { EarlierMonths } from './bills-earlier-months'

// The month-grouped ledger. Current month is the live view — one flat list
// (the StatusBadge carries each row's state), ordered Overdue → Due →
// Awaiting synthetics → Paid. Earlier months load on demand below.
export async function BillsLedger({ propertyId }: { propertyId: string }) {
  const [{ ledger, month, today, earliestMonth }, summary, t, format] = await Promise.all([
    getPropertyLedger(propertyId),
    getPropertyBillsSummary(propertyId),
    getTranslations('property.bills'),
    getFormatter(),
  ])

  const isEmpty =
    ledger.overdue.length === 0 &&
    ledger.due.length === 0 &&
    ledger.awaiting.length === 0 &&
    ledger.paid.length === 0

  if (isEmpty) {
    return (
      <EmptyState>
        <EmptyStateIcon tone="muted">
          <Receipt />
        </EmptyStateIcon>
        <EmptyStateTitle>{t('emptyTitle')}</EmptyStateTitle>
        <EmptyStateDescription>{t('emptyDescription')}</EmptyStateDescription>
      </EmptyState>
    )
  }

  const hasEarlierMonths =
    earliestMonth !== null &&
    earliestMonth.year * 12 + earliestMonth.month < month.year * 12 + month.month

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <SectionLabel>
          {format.dateTime(new Date(`${monthStartISO(month)}T12:00:00Z`), {
            month: 'long',
            year: 'numeric',
          })}
        </SectionLabel>
        <List>
          {[...ledger.overdue, ...ledger.due].map((bill) => (
            <LedgerBillRow key={bill.id} bill={bill} today={today} />
          ))}
          {ledger.awaiting.map((charge) => (
            <LedgerAwaitingRow
              key={charge.definitionId}
              charge={charge}
              currency={summary.currency}
            />
          ))}
          {ledger.paid.map((bill) => (
            <LedgerBillRow key={bill.id} bill={bill} today={today} />
          ))}
        </List>
      </div>

      {hasEarlierMonths && earliestMonth ? (
        <EarlierMonths
          propertyId={propertyId}
          currentMonth={month}
          earliestMonth={earliestMonth}
          today={today}
        />
      ) : null}
    </div>
  )
}
