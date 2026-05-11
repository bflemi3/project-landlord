'use client'

import { useCallback, useMemo } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { CalendarDays } from 'lucide-react'

import { formatCurrency } from '@/lib/format-currency'
import { formatDate } from '@/lib/format'
import type { Locale } from '@/i18n/routing'

import {
  type RentDatesInput,
  type SupportedCurrency,
} from './schemas'
import { setAllTouched, type RentDatesTouched } from './state'
import type { SectionId } from '../../../../state/registry'
import {
  usePropertyCreationActions,
  usePropertyCreationState,
  usePropertyCreationStoreApi,
} from '../../../../state/use-property-creation'
import { validateRentDates } from '../../../../state/actions/validate-rent-dates'
import { useCheckoutContext } from '../../checkout-context'
import { Section } from '../../section'
import { SectionSkeleton } from '../section-skeleton'
import { SummaryRow } from '../summary-row'
import { AutoFilledIndicator } from '../auto-filled-indicator'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldRow,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { IsoDatePicker } from '@/components/ui/iso-date-picker'
import { CurrencyInput } from '@/components/ui/currency-input'
import { useWizardForm } from '../../../../state/use-wizard-form'
import { validateRentDates as validateRentDatesParse } from './validation'

const SECTION_ID: SectionId = 'rent-dates'
const ICON = CalendarDays

type RentDatesField = keyof RentDatesInput

export function RentDatesSection() {
  const t = useTranslations('propertyCreation.checkout')
  const tRentDates = useTranslations('rentDates')
  const { registerHeaderRef } = useCheckoutContext()
  const {
    setSectionData,
    applyServerErrorsResponse,
    clearFieldServerError,
  } = usePropertyCreationActions()
  const storeApi = usePropertyCreationStoreApi()
  const values = usePropertyCreationState(
    (s) => s.sectionData['rent-dates'] as RentDatesInput,
  )
  const path = usePropertyCreationState((s) => s.path)

  const locale = useLocale() as Locale
  const sectionSummary = useMemo(
    () => formatRentDatesSummary(values, tRentDates, locale),
    [values, tRentDates, locale],
  )

  const touched = usePropertyCreationState(
    (s) => s.sectionTouched['rent-dates'] as RentDatesTouched,
  )
  // Cached parse — shared with section status, summary panel, and Continue
  // gate. Two-level cache (slice ref × path) handles contract/no-contract.
  const parseResult = usePropertyCreationState((s) =>
    validateRentDatesParse(s.sectionData['rent-dates'] as RentDatesInput, s.path),
  )
  const { errors, isValid, setTouched } = useWizardForm({
    sectionId: 'rent-dates',
    parseResult,
    touched,
  })
  // Server-side errors now read from the persisted store slice. The merge
  // expression below (`errors[field]?.[0] ?? serverErrors[field]?.[0]`) is
  // unchanged — only the source has moved from local React state to Zustand.
  const serverErrors = usePropertyCreationState(
    (s) => (s.sectionServerErrors['rent-dates'] ?? {}) as Record<string, string[]>,
  )

  // Append a single field to the section's touched set. The form constructs
  // the updater inline since its shape (a `Set<string>`) is the form's own
  // concern — section-level helpers stay minimal.
  const markTouched = useCallback(
    (field: RentDatesField) => {
      setTouched<RentDatesTouched>((prev) => {
        if (prev.has(field)) return prev
        const next = new Set(prev)
        next.add(field)
        return next
      })
    },
    [setTouched],
  )

  const promoteAllTouched = useCallback(() => {
    setTouched<RentDatesTouched>((prev) => setAllTouched(prev))
  }, [setTouched])

  // `errors` is already touch-gated by the hook. Server-side errors (from
  // `validateRentDates`) are always shown when present, so they merge on
  // top of the form's filtered errors.
  const fieldError = useCallback(
    (field: RentDatesField) => errors[field]?.[0] ?? serverErrors[field]?.[0],
    [errors, serverErrors],
  )

  // Read values + path via storeApi so the callback identity is stable
  // across keystrokes — closing over them would recreate this function on
  // every edit and cascade recomputes through Section.Actions.
  const onBeforeContinue = useCallback(async () => {
    const state = storeApi.getState()
    const slice = state.sectionData['rent-dates'] as RentDatesInput
    const result = await validateRentDates(slice, state.path ?? 'contract')
    applyServerErrorsResponse(result)
    return result.ok
  }, [storeApi, applyServerErrorsResponse])

  function setField<K extends keyof RentDatesInput>(
    key: K,
    next: RentDatesInput[K],
  ) {
    clearFieldServerError('rent-dates', key)
    setSectionData<RentDatesInput>('rent-dates', (prev: RentDatesInput) => ({
      ...prev,
      [key]: next,
    }))
  }

  const amountError = fieldError('amount_minor')
  const hasAmountError = Boolean(amountError)
  const dueDayError = fieldError('due_day')
  const hasDueDayError = Boolean(dueDayError)
  const startDateError = fieldError('start_date')
  const hasStartDateError = Boolean(startDateError)
  const endDateError = fieldError('end_date')
  const hasEndDateError = Boolean(endDateError)

  return (
    <Section
      id={SECTION_ID}
      onFirstVisit={promoteAllTouched}
      onLeave={promoteAllTouched}
    >
      <Section.Header ref={registerHeaderRef(SECTION_ID)}>
        <Section.Icon>
          <ICON />
        </Section.Icon>
        <Section.HeaderContent>
          <Section.Title>{t('rent-dates.title')}</Section.Title>
          <Section.Subtitle>{t('rent-dates.subtitle')}</Section.Subtitle>
          <Section.Summary>{sectionSummary}</Section.Summary>
        </Section.HeaderContent>
        <Section.Status
          doneLabel={t('status.done')}
          needsAttentionLabel={t('status.needsAttention')}
          skippedLabel={t('status.skipped')}
          upNextLabel={t('status.upNext')}
        />
      </Section.Header>
      <Section.Body>
        <FieldGroup>
          <FieldRow columns={3} breakpoint="md">
            <Field
              className="md:col-span-2"
              data-invalid={hasAmountError || undefined}
            >
              <FieldLabel htmlFor="rent-amount">
                {tRentDates('rentAmount')}
                <AutoFilledIndicator path="rent-dates.amount_minor" />
              </FieldLabel>
              <CurrencyInput
                id="rent-amount"
                name="amount_minor"
                aria-label={tRentDates('rentAmount')}
                aria-invalid={hasAmountError}
                aria-describedby={
                  hasAmountError ? 'amount_minor-error' : undefined
                }
                currency={values.currency}
                value={values.amount_minor}
                onBlur={() => markTouched('amount_minor')}
                onCurrencyChange={(currency: SupportedCurrency) => {
                  setField('currency', currency)
                  markTouched('currency')
                }}
                onValueChange={(amount) => {
                  setField('amount_minor', amount)
                }}
              />
              {hasAmountError && (
                <FieldError id="amount_minor-error">
                  {tRentDates(amountError!)}
                </FieldError>
              )}
            </Field>

            <Field data-invalid={hasDueDayError || undefined}>
              <FieldLabel htmlFor="rent-due-day">
                {tRentDates('dueDay')}
                <AutoFilledIndicator path="rent-dates.due_day" />
              </FieldLabel>
              <Input
                id="rent-due-day"
                name="due_day"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={2}
                value={values.due_day != null ? String(values.due_day) : ''}
                onChange={(e) => {
                  const raw = e.target.value.trim()
                  if (raw === '') {
                    setField('due_day', undefined)
                    return
                  }
                  const n = Number(raw)
                  if (Number.isFinite(n)) setField('due_day', n)
                }}
                onBlur={() => markTouched('due_day')}
                aria-invalid={hasDueDayError}
                aria-describedby={
                  hasDueDayError ? 'due_day-error' : undefined
                }
              />
              {hasDueDayError && (
                <FieldError id="due_day-error">
                  {tRentDates(dueDayError!)}
                </FieldError>
              )}
            </Field>
          </FieldRow>

          {/* Dates pair as "from / to" on desktop, stack on mobile. */}
          <FieldRow columns={2} breakpoint="md">
            <Field data-invalid={hasStartDateError || undefined}>
              <FieldLabel htmlFor="rent-start-date">
                {tRentDates('startDate')}
                <AutoFilledIndicator path="rent-dates.start_date" />
              </FieldLabel>
              <IsoDatePicker
                id="rent-start-date"
                name="start_date"
                value={values.start_date}
                invalid={hasStartDateError}
                describedBy={
                  hasStartDateError ? 'start_date-error' : undefined
                }
                onValueChange={(next) => {
                  setField('start_date', next)
                  markTouched('start_date')
                }}
                onBlur={() => markTouched('start_date')}
              />
              {hasStartDateError && (
                <FieldError id="start_date-error">
                  {tRentDates(startDateError!)}
                </FieldError>
              )}
            </Field>

            <Field data-invalid={hasEndDateError || undefined}>
              <FieldLabel htmlFor="rent-end-date">
                {tRentDates('endDate')}
                <AutoFilledIndicator path="rent-dates.end_date" />
              </FieldLabel>
              <IsoDatePicker
                id="rent-end-date"
                name="end_date"
                value={values.end_date}
                min={values.start_date}
                invalid={hasEndDateError}
                describedBy={
                  hasEndDateError ? 'end_date-error' : undefined
                }
                onValueChange={(next) => {
                  setField('end_date', next)
                  markTouched('end_date')
                }}
                onBlur={() => markTouched('end_date')}
              />
              {hasEndDateError && (
                <FieldError id="end_date-error">
                  {tRentDates(endDateError!)}
                </FieldError>
              )}
            </Field>
          </FieldRow>
        </FieldGroup>
        <Section.Actions
          backLabel={t('actions.back')}
          continueLabel={t('actions.continue')}
          continueDisabled={!isValid}
          skipLabel={t('actions.skip')}
          onBeforeContinue={onBeforeContinue}
        />
      </Section.Body>
    </Section>
  )
}

export function RentDatesSectionSkeleton() {
  return <SectionSkeleton sectionId={SECTION_ID} icon={ICON} />
}

export function RentDatesSummaryRow() {
  const t = useTranslations('propertyCreation.checkout.rent-dates')
  const tRentDates = useTranslations('rentDates')
  const locale = useLocale() as Locale
  const values = usePropertyCreationState(
    (s) => s.sectionData['rent-dates'] as RentDatesInput,
  )
  const detail = useMemo(
    () => formatRentDatesSummary(values, tRentDates, locale, { compact: true }),
    [values, tRentDates, locale],
  )
  
  return (
    <SummaryRow
      sectionId={SECTION_ID}
      title={t('title')}
      detail={detail || null}
    />
  )
}

// Builds the recap line shown in the section header (`Section.Summary`) and
// the desktop summary panel (`SummaryRow detail`). Formats whichever fields
// the user has filled and gracefully drops parts that aren't set yet —
// returns an empty string when nothing is filled so consumers can pass
// `|| null` to suppress the line.
//
// `compact` switches the date range to month-only ("Mar 2025") for the
// summary card, which has less room than the section header. The section
// header keeps the full day-month-year version.
//
// Date range only renders when BOTH start and end are set, since "from X"
// or "until Y" alone reads awkwardly across locales without dedicated copy.
//
// All date formatting goes through `formatDate` which uses Intl with the
// app's mapped locale, so month abbreviations and ordering are correct in
// each locale.
function formatRentDatesSummary(
  values: RentDatesInput,
  tRentDates: ReturnType<typeof useTranslations<'rentDates'>>,
  locale: Locale,
  options: { compact?: boolean } = {},
): string {
  const parts: string[] = []
  if (values.amount_minor !== undefined && values.amount_minor > 0) {
    parts.push(formatCurrency(values.amount_minor, values.currency))
  }
  if (values.due_day !== undefined && values.due_day !== null) {
    parts.push(tRentDates('summaryDueDay', { day: values.due_day }))
  }
  if (values.start_date && values.end_date) {
    // `formatDate` defaults to `day: '2-digit'`. For the section header we
    // want "Mar 1, 2025" (numeric day, abbreviated month). For the compact
    // summary row we drop the day entirely → "Mar 2025".
    const dateOptions: Intl.DateTimeFormatOptions = options.compact
      ? { day: undefined, month: 'short', year: '2-digit' }
      : { day: 'numeric', month: 'short', year: 'numeric' }
    const start = formatDate(values.start_date, locale, dateOptions)
    const end = formatDate(values.end_date, locale, dateOptions)
    parts.push(`${start} - ${end}`)
  }
  return parts.join(' · ')
}
