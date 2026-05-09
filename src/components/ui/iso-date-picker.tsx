'use client'

import { useCallback, useMemo, useState } from 'react'
import { useLocale } from 'next-intl'
import { CalendarIcon } from 'lucide-react'
import type { Locale as DayPickerLocale } from 'react-day-picker'
import { enUS, es, ptBR } from 'react-day-picker/locale'

import {
  formatIsoDate,
  formatLocaleDate,
  parseIsoDate,
  parseLocaleDate,
} from '@/lib/iso-date'
import { type Locale } from '@/i18n/routing'
import { Calendar } from './calendar'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from './input-group'
import { Popover, PopoverContent, PopoverTrigger } from './popover'

// react-day-picker localization for every locale next-intl ships. Typed as
// `Record<Locale, ...>` so adding or removing a locale in `src/i18n/routing.ts`
// fails compilation here until the map is updated.
const DAY_PICKER_LOCALES: Record<Locale, DayPickerLocale> = {
  en: enUS,
  'pt-BR': ptBR,
  es,
}

// Locales whose short slashed format leads with day. Mirrors the table in
// `src/lib/iso-date.ts`; kept in sync via the same i18n routing source.
const DAY_FIRST_LOCALES = new Set<Locale>(['pt-BR', 'es'])

// Year span around today for the calendar's year dropdown. 5 back covers
// landlords onboarding mid-tenancy; 10 forward covers any reasonable lease.
const YEAR_RANGE_BACK = 5
const YEAR_RANGE_FORWARD = 10

function getFormatPlaceholder(locale: string): string {
  return DAY_FIRST_LOCALES.has(locale as Locale) ? 'dd/mm/yyyy' : 'mm/dd/yyyy'
}

interface IsoDatePickerProps {
  id?: string
  name?: string
  /** Selected date as ISO YYYY-MM-DD, or undefined when blank. */
  value: string | undefined
  /** Inclusive lower bound for selectable dates (ISO YYYY-MM-DD). */
  min?: string
  /** Inclusive upper bound for selectable dates (ISO YYYY-MM-DD). */
  max?: string
  /** Override the auto-generated locale format hint. */
  placeholder?: string
  invalid?: boolean
  describedBy?: string
  disabled?: boolean
  className?: string
  /** Mirrors `Input`'s variant. Defaults to `card`. */
  variant?: 'card' | 'page'
  onValueChange: (next: string | undefined) => void
  onBlur?: () => void
}

export function IsoDatePicker({
  id,
  name,
  value,
  min,
  max,
  placeholder,
  invalid,
  describedBy,
  disabled,
  className,
  variant,
  onValueChange,
  onBlur,
}: IsoDatePickerProps) {
  const locale = useLocale()
  const [open, setOpen] = useState(false)

  const selected = useMemo(() => parseIsoDate(value), [value])
  const minDate = useMemo(() => parseIsoDate(min), [min])
  const maxDate = useMemo(() => parseIsoDate(max), [max])

  // Local input string — what the user sees and types. Typing updates this
  // directly without waiting for a successful parse, so partial entries like
  // "05/0" stay visible. When `value` or `locale` change externally (calendar
  // pick, extraction, parent reset, locale switch), we resync via the
  // set-state-during-render pattern: React aborts the in-progress render and
  // re-runs immediately, so there's no extra paint and no useEffect chain.
  // See https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const [text, setText] = useState(() => formatLocaleDate(value, locale))
  const [textSyncKey, setTextSyncKey] = useState({ value, locale })
  if (textSyncKey.value !== value || textSyncKey.locale !== locale) {
    setTextSyncKey({ value, locale })
    setText(formatLocaleDate(value, locale))
  }

  // Calendar's visible month — mirrors the slice value when set, falls back
  // to today otherwise. Typing a parseable date scrolls the calendar to that
  // month so the popover opens on the right page. Same set-state-during-
  // render pattern as `text` for resyncing to external value changes.
  const [month, setMonth] = useState<Date | undefined>(
    () => parseIsoDate(value) ?? new Date(),
  )
  const [monthSyncValue, setMonthSyncValue] = useState(value)
  if (monthSyncValue !== value) {
    setMonthSyncValue(value)
    const date = parseIsoDate(value)
    if (date) setMonth(date)
  }

  // Stable today-anchored year window. Empty deps freeze the bounds for the
  // component's lifetime so the dropdown doesn't shift mid-edit.
  const yearBounds = useMemo(
    () => ({
      startMonth: new Date(new Date().getFullYear() - YEAR_RANGE_BACK, 0, 1),
      endMonth: new Date(new Date().getFullYear() + YEAR_RANGE_FORWARD, 11, 31),
    }),
    [],
  )

  const dayPickerLocale = DAY_PICKER_LOCALES[locale as Locale] ?? enUS

  const isOutsideRange = useCallback(
    (date: Date) => {
      if (minDate && date < minDate) return true
      if (maxDate && date > maxDate) return true
      return false
    },
    [minDate, maxDate],
  )

  return (
    <InputGroup variant={variant} className={className}>
      <InputGroupInput
        id={id}
        name={name}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={text}
        placeholder={placeholder ?? getFormatPlaceholder(locale)}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        onChange={(e) => {
          const next = e.target.value
          setText(next)
          if (next === '') {
            onValueChange(undefined)
            return
          }
          const parsed = parseLocaleDate(next, locale)
          if (parsed !== undefined) {
            onValueChange(parsed)
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setOpen(true)
          }
        }}
        onBlur={onBlur}
      />
      <InputGroupAddon align="inline-end">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger
            render={
              <InputGroupButton
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Select date"
                disabled={disabled}
              >
                <CalendarIcon />
                <span className="sr-only">Select date</span>
              </InputGroupButton>
            }
          />
          <PopoverContent
            align="end"
            alignOffset={-8}
            sideOffset={10}
            className="w-auto p-0"
          >
            <Calendar
              mode="single"
              selected={selected}
              month={month}
              onMonthChange={setMonth}
              onSelect={(next) => {
                onValueChange(formatIsoDate(next))
                setOpen(false)
              }}
              locale={dayPickerLocale}
              disabled={isOutsideRange}
              captionLayout="dropdown"
              startMonth={yearBounds.startMonth}
              endMonth={yearBounds.endMonth}
              className="p-4 [--cell-size:--spacing(10)]"
            />
          </PopoverContent>
        </Popover>
      </InputGroupAddon>
    </InputGroup>
  )
}
