'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { useFormatter, useTranslations } from 'next-intl'

import { List } from '@/components/list-row'
import { SectionLabel } from '@/components/section-label'
import { Skeleton } from '@/components/ui/skeleton'
import { useEarlierLedgerMonths } from '@/data/charges/client'
import { addMonths, monthStartISO, type YearMonth } from '@/data/charges/shared'

import { LedgerBillRow } from './ledger-row'

type EarlierMonthsProps = {
  currentMonth: YearMonth
  earliestMonth: YearMonth
  propertyId: string
  /** YYYY-MM-DD resolved server-side in the property's tz. */
  today: string
}

// Frozen history revealed one calendar month per tap. The next earlier month
// renders as a collapsed "ghost" header (muted label + chevron); tapping it
// expands that month in place and the following ghost header appears below,
// so history reads as a continuous timeline. The infinite query only mounts
// after the first tap, so the initial Bills render costs nothing.
export function EarlierMonths(props: EarlierMonthsProps) {
  const [expanded, setExpanded] = useState(false)

  if (!expanded) {
    return (
      <GhostMonthHeader
        month={addMonths(props.currentMonth, -1)}
        onClick={() => setExpanded(true)}
      />
    )
  }
  return <EarlierMonthsList {...props} />
}

function EarlierMonthsList({ currentMonth, earliestMonth, propertyId, today }: EarlierMonthsProps) {
  const t = useTranslations('property.bills')
  const monthName = useMonthName()
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isPending } =
    useEarlierLedgerMonths(propertyId, currentMonth, earliestMonth)

  if (isPending) return <LoadingMonth month={addMonths(currentMonth, -1)} />

  const pages = data?.pages ?? []
  const lastLoadedMonth = pages.at(-1)?.month
  const nextMonth = lastLoadedMonth ? addMonths(lastLoadedMonth, -1) : null

  return (
    <div className="flex flex-col gap-6">
      {pages.map((page) => (
        <div key={`${page.month.year}-${page.month.month}`} className="flex flex-col gap-1">
          <SectionLabel>{monthName(page.month)}</SectionLabel>
          {page.bills.length > 0 ? (
            <List>
              {page.bills.map((bill) => (
                <LedgerBillRow key={bill.id} bill={bill} today={today} />
              ))}
            </List>
          ) : (
            <p className="text-muted-foreground py-3 text-sm">{t('emptyMonth')}</p>
          )}
        </div>
      ))}
      {hasNextPage && nextMonth ? (
        isFetchingNextPage ? (
          <LoadingMonth month={nextMonth} />
        ) : (
          <GhostMonthHeader month={nextMonth} onClick={() => fetchNextPage()} />
        )
      ) : null}
    </div>
  )
}

// Matches SectionLabel typography so the tap reads as the header expanding in
// place rather than a button being replaced.
function GhostMonthHeader({ month, onClick }: { month: YearMonth; onClick: () => void }) {
  const t = useTranslations('property.bills')
  const monthName = useMonthName()
  const label = monthName(month)

  return (
    <button
      type="button"
      aria-label={t('showMonth', { month: label })}
      onClick={onClick}
      className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/25 flex w-full items-center justify-between rounded-md py-2.5 text-sm font-medium transition-colors outline-none select-none focus-visible:ring-2"
    >
      {label}
      <ChevronDown aria-hidden className="size-4" />
    </button>
  )
}

function LoadingMonth({ month }: { month: YearMonth }) {
  const monthName = useMonthName()
  return (
    <div className="flex flex-col gap-1">
      <SectionLabel>{monthName(month)}</SectionLabel>
      <div className="flex flex-col gap-3">
        {['a', 'b', 'c'].map((key) => (
          <Skeleton key={key} className="h-10 w-full" />
        ))}
      </div>
    </div>
  )
}

function useMonthName() {
  const format = useFormatter()
  return (month: YearMonth) =>
    format.dateTime(new Date(`${monthStartISO(month)}T12:00:00Z`), {
      month: 'long',
      year: 'numeric',
    })
}
