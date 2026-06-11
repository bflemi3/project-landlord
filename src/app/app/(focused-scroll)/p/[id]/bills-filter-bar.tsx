'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { CalendarIcon, ChevronDownIcon } from 'lucide-react'
import { type DateRange, type Locale as DayPickerLocale } from 'react-day-picker'
import { enUS, es, ptBR } from 'react-day-picker/locale'

import { cn } from '@/lib/utils'
import { useMediaQuery } from '@/lib/hooks/use-media-query'
import { useHasHydrated } from '@/lib/hooks/use-has-hydrated'
import { type Locale } from '@/i18n/routing'
import { useExpenseDefinitions } from '@/data/charges/client'

import { useBillsFilters, usePropertyPageActions } from './state/provider'
import { StatusBadge, type StatusBadgeVariant } from '@/components/status-badge'
import { EdgeScroller } from '@/components/edge-scroller'
import { Calendar } from '@/components/ui/calendar'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Combobox,
  ComboboxContent,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from '@/components/ui/combobox'
import {
  ResponsivePopover,
  ResponsivePopoverContent,
  ResponsivePopoverTrigger,
} from '@/components/responsive-popover'

const DAY_PICKER_LOCALES: Record<Locale, DayPickerLocale> = {
  en: enUS,
  'pt-BR': ptBR,
  es,
}

// Shared filter-pill trigger styling — the combobox filters and the date range
// trigger use the same chrome so the bar reads as one set of controls.
const filterTriggerBase =
  'inline-flex h-10 shrink-0 items-center gap-2 rounded-md border border-input px-3 text-sm text-muted-foreground transition-colors hover:bg-muted/50'
const filterTriggerActive = 'border-primary/60 bg-primary/5 text-foreground'

interface StatusOption {
  value: 'overdue' | 'due' | 'awaiting' | 'paid'
  variant: StatusBadgeVariant
}

// Labels come from the shared `property.bills.statuses.*` keys.
const STATUS_OPTIONS: StatusOption[] = [
  { value: 'overdue', variant: 'overdue' },
  { value: 'due', variant: 'pending' },
  { value: 'awaiting', variant: 'default' },
  { value: 'paid', variant: 'paid' },
]

interface FilterComboboxProps {
  children: ReactNode
  label: string
  value: string[]
  onValueChange: (value: string[]) => void
}

function FilterCombobox({ children, label, value, onValueChange }: FilterComboboxProps) {
  const active = value.length > 0

  return (
    <Combobox<string, true> multiple value={value} onValueChange={(next) => onValueChange(next)}>
      <ComboboxTrigger className={cn(filterTriggerBase, active && filterTriggerActive)}>
        <span>{label}</span>
        {active ? (
          <>
            <span aria-hidden className="text-muted-foreground">
              ·
            </span>
            <span>{value.length}</span>
          </>
        ) : null}
      </ComboboxTrigger>
      <ComboboxContent title={label} className="md:w-64">
        <ComboboxList>{children}</ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}

function formatDateRange(range: DateRange | undefined, locale: string): string | null {
  if (!range?.from) return null
  const fmt = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' })
  return range.to ? `${fmt.format(range.from)} – ${fmt.format(range.to)}` : fmt.format(range.from)
}

interface DateRangeFilterProps {
  label: string
  value: DateRange | undefined
  onValueChange: (range: DateRange | undefined) => void
}

function DateRangeFilter({ label, value, onValueChange }: DateRangeFilterProps) {
  const locale = useLocale()
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const [open, setOpen] = useState(false)

  const dayPickerLocale = DAY_PICKER_LOCALES[locale as Locale] ?? enUS
  const active = Boolean(value?.from)
  const display = useMemo(() => formatDateRange(value, locale) ?? label, [value, label, locale])

  return (
    <ResponsivePopover open={open} onOpenChange={setOpen}>
      <ResponsivePopoverTrigger
        render={
          <button type="button" className={cn(filterTriggerBase, active && filterTriggerActive)}>
            <CalendarIcon className="size-4 shrink-0 opacity-60" />
            <span className="truncate">{display}</span>
            <ChevronDownIcon className="size-4 shrink-0 opacity-60" />
          </button>
        }
      />
      <ResponsivePopoverContent title={label} showTitle align="start" className="w-auto p-0">
        <Calendar
          mode="range"
          defaultMonth={value?.from}
          selected={value}
          onSelect={onValueChange}
          numberOfMonths={isDesktop ? 2 : 1}
          locale={dayPickerLocale}
          className="p-3 [--cell-size:--spacing(10)]"
        />
      </ResponsivePopoverContent>
    </ResponsivePopover>
  )
}

// Company names are formatted "Type · Provider" (e.g. "Água · Sabesp"): show the
// utility type prominently, mute the provider.
function CompanyOptionLabel({ name }: { name: string }) {
  const [type, ...rest] = name.split(' · ')
  return (
    <span className="flex-1 truncate">
      <span className="text-foreground">{type}</span>
      {rest.length > 0 ? (
        <span className="text-muted-foreground"> · {rest.join(' · ')}</span>
      ) : null}
    </span>
  )
}

interface BillsFilterBarProps {
  propertyId: string
}

export function BillsFilterBar({ propertyId }: BillsFilterBarProps) {
  const t = useTranslations('property.bills')
  const hasHydrated = useHasHydrated()
  const { setBillsFilters } = usePropertyPageActions()
  const billsFilters = useBillsFilters()
  const { data: definitions } = useExpenseDefinitions(propertyId)

  // Until the client has hydrated (when the persisted filters are available),
  // show the skeleton rather than flashing the default (empty) selections.
  if (!hasHydrated) return <BillsFilterBarSkeleton />

  return (
    <EdgeScroller>
      <FilterCombobox
        label={t('filters.company')}
        value={billsFilters.companies}
        onValueChange={(companies) => setBillsFilters((prev) => ({ ...prev, companies }))}
      >
        {definitions.map((definition) => (
          <ComboboxItem key={definition.id} value={definition.id}>
            <CompanyOptionLabel name={definition.name} />
          </ComboboxItem>
        ))}
      </FilterCombobox>

      <FilterCombobox
        label={t('filters.status')}
        value={billsFilters.statuses}
        onValueChange={(statuses) => setBillsFilters((prev) => ({ ...prev, statuses }))}
      >
        {STATUS_OPTIONS.map((option) => (
          <ComboboxItem key={option.value} value={option.value}>
            <StatusBadge variant={option.variant}>{t(`statuses.${option.value}`)}</StatusBadge>
          </ComboboxItem>
        ))}
      </FilterCombobox>

      <DateRangeFilter
        label={t('filters.date')}
        value={billsFilters.dateRange}
        onValueChange={(dateRange) => setBillsFilters((prev) => ({ ...prev, dateRange }))}
      />
    </EdgeScroller>
  )
}

export function BillsFilterBarSkeleton() {
  return (
    <EdgeScroller aria-hidden>
      <Skeleton className="h-10 w-28 shrink-0" />
      <Skeleton className="h-10 w-24 shrink-0" />
      <Skeleton className="h-10 w-32 shrink-0" />
    </EdgeScroller>
  )
}
