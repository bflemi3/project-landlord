'use client'

import { useCallback, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { CalendarDays } from 'lucide-react'

import type {
  RentDatesInput,
  SupportedCurrency,
} from '../../../state/rent-dates-schema'
import type { SectionId } from '../../../state/registry'
import {
  usePropertyCreationActions,
  usePropertyCreationState,
} from '../../../state/use-property-creation'
import { validateRentDates } from '../../../state/actions/validate-rent-dates'
import { useCheckoutContext } from '../checkout-context'
import { Section } from '../section'
import { useSectionController } from '../use-section-controller'
import { SectionSkeleton } from './section-skeleton'
import { SummaryRow } from './summary-row'
import { AutoFilledIndicator } from './auto-filled-indicator'
import { ErrorHint } from '@/components/forms/error-hint'
import { FieldHint } from '@/components/forms/field-hint'
import { FormField, FormRoot } from '@/components/forms/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CurrencyInput } from '@/components/ui/currency-input'
import { zodValidator, useFormValidation } from '@/lib/forms/use-form-validation'
import { useServerValidationErrors } from '@/lib/forms/use-server-validation-errors'
import { rentDatesSchemaFor } from '../../../state/rent-dates-schema'

const SECTION_ID: SectionId = 'rent-dates'
const ICON = CalendarDays

export function RentDatesSection() {
  const t = useTranslations('propertyCreation.checkout')
  const tRentDates = useTranslations('rentDates')
  const { registerHeaderRef } = useCheckoutContext()
  const { setSectionData } = usePropertyCreationActions()
  const values = usePropertyCreationState(
    (s) => s.sectionData['rent-dates'] as RentDatesInput,
  )
  const path = usePropertyCreationState((s) => s.path)

  // Path-aware validator: contract path makes amount_minor + due_day
  // required; no-contract path keeps them optional. Switching paths after
  // the section has rendered is uncommon, but useMemo keeps the validator
  // referentially stable per path so useFormValidation doesn't re-parse on
  // every render.
  const validator = useMemo(
    () => zodValidator(rentDatesSchemaFor(path)),
    [path],
  )

  const form = useFormValidation({ values, validator })
  const { markTouched } = form
  const {
    setServerErrors,
    clearServerErrors,
    hasFieldError,
    getFieldError,
  } = useServerValidationErrors<RentDatesInput>()

  const onBeforeContinue = useCallback(async () => {
    const result = await validateRentDates(values, path ?? 'contract')
    if (result.valid) {
      clearServerErrors()
      return true
    }

    setServerErrors(result.errors ?? {})
    return result.valid
  }, [values, path, setServerErrors, clearServerErrors])

  const ctrl = useSectionController(SECTION_ID, { onBeforeContinue })

  function setField<K extends keyof RentDatesInput>(
    key: K,
    next: RentDatesInput[K],
  ) {
    clearServerErrors(key)
    setSectionData<RentDatesInput>('rent-dates', (prev: RentDatesInput) => ({
      ...prev,
      [key]: next,
    }))
  }

  const amountError = getFieldError(form, 'amount_minor')
  const hasAmountError = hasFieldError(form, 'amount_minor')
  const dueDayError = getFieldError(form, 'due_day')
  const hasDueDayError = hasFieldError(form, 'due_day')

  return (
    <Section
      id={SECTION_ID}
      isActive={ctrl.isActive}
      isUpNext={ctrl.isUpNext}
      status={ctrl.status}
    >
      <Section.Header ref={registerHeaderRef(SECTION_ID)}>
        <Section.Icon>
          <ICON />
        </Section.Icon>
        <Section.HeaderContent>
          <Section.Title>{t('rent-dates.title')}</Section.Title>
          <Section.Subtitle>{t('rent-dates.subtitle')}</Section.Subtitle>
        </Section.HeaderContent>
        <Section.Status
          doneLabel={t('status.done')}
          skippedLabel={t('status.skipped')}
          upNextLabel={t('status.upNext')}
        />
      </Section.Header>
      <Section.Body>
        <FormRoot>
          <FormField>
            <Label htmlFor="rent-amount">
              {tRentDates('rentAmount')}
              <AutoFilledIndicator path="rent-dates.amount_minor" />
            </Label>
            <CurrencyInput
              id="rent-amount"
              name="amount_minor"
              aria-label={tRentDates('rentAmount')}
              aria-invalid={hasAmountError}
              aria-describedby={
                hasAmountError ? 'amount_minor-error' : 'amount_minor-hint'
              }
              currency={values.currency}
              value={values.amount_minor}
              size="lg"
              onBlur={() => markTouched('amount_minor')}
              onCurrencyChange={(currency: SupportedCurrency) => {
                setField('currency', currency)
                markTouched('currency')
              }}
              onValueChange={(amount) => {
                setField('amount_minor', amount)
              }}
            />
            {hasAmountError && amountError ? (
              <ErrorHint
                field="amount_minor"
                error={tRentDates(amountError)}
              />
            ) : (
              <FieldHint field="amount_minor">
                {tRentDates('rentAmountHint')}
              </FieldHint>
            )}
          </FormField>

          <FormField>
            <Label htmlFor="rent-due-day">
              {tRentDates('dueDay')}
              <AutoFilledIndicator path="rent-dates.due_day" />
            </Label>
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
                hasDueDayError ? 'due_day-error' : 'due_day-hint'
              }
            />
            {hasDueDayError && dueDayError ? (
              <ErrorHint field="due_day" error={tRentDates(dueDayError)} />
            ) : (
              <FieldHint field="due_day">
                {tRentDates('dueDayHint')}
              </FieldHint>
            )}
          </FormField>
        </FormRoot>
        <Section.Actions
          backLabel={t('actions.back')}
          continueLabel={t('actions.continue')}
          continueDisabled={!form.isValid}
          continueLoading={ctrl.isContinuing}
          skipLabel={t('actions.skip')}
          showSkip={!ctrl.isRequired}
          onBack={ctrl.handleBack}
          onContinue={ctrl.handleContinue}
          onSkip={ctrl.handleSkip}
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
  return <SummaryRow sectionId={SECTION_ID} title={t('title')} />
}
