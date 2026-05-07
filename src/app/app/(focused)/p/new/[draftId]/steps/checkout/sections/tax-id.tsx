'use client'

import { useCallback, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Check, CreditCard } from 'lucide-react'
import { toast } from 'sonner'

import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
} from '@/components/ui/field'
import { Skeleton } from '@/components/ui/skeleton'
import { TaxIdInput, TaxIdLabel } from '@/components/ui/tax-id'
import {
  useFormValidation,
  zodValidator,
} from '@/lib/forms/use-form-validation'
import { detectTaxIdKindBR } from '@/lib/tax-id/br'

import type { PropertyInput } from '../../../state/extraction-seeding'
import type { SectionId } from '../../../state/registry'
import {
  getTaxIdInputSchema,
  type TaxIdInput as TaxIdSectionInput,
} from '../../../state/tax-id-schema'
import {
  useIsSectionActive,
  useIsSectionUpNext,
  usePropertyCreationActions,
  usePropertyCreationHasHydrated,
  usePropertyCreationState,
  useSectionStatus,
} from '../../../state/use-property-creation'
import { useCheckoutContext } from '../checkout-context'
import { Section } from '../section'
import { useSectionController } from '../use-section-controller'
import { SectionSkeleton } from './section-skeleton'
import { SummaryRow } from './summary-row'

const SECTION_ID: SectionId = 'tax-id'
const ICON = CreditCard

// Builds the recap line shown both in the section's collapsed header and the
// desktop summary panel. For BR-specialized values, prefix with the kind
// (`CPF` / `CNPJ`) so the recap reads like a labeled value. For empty or
// non-BR values, fall back to the raw value (or empty string).
function formatTaxIdSummary(taxId: string, countryCode: string): string {
  if (!taxId) return ''
  if (countryCode !== 'BR') return taxId
  const kind = detectTaxIdKindBR(taxId)
  if (kind === 'cpf') return `CPF ${taxId}`
  if (kind === 'cnpj') return `CNPJ ${taxId}`
  return taxId
}

export function TaxIdSection() {
  const t = useTranslations('propertyCreation.checkout')
  const tTaxId = useTranslations('propertyCreation.checkout.tax-id')
  const { registerHeaderRef } = useCheckoutContext()
  // Section primitive props read directly so the outer doesn't carry the
  // controller's handler state (which only the body needs for Section.Actions).
  const status = useSectionStatus(SECTION_ID)
  const isActive = useIsSectionActive(SECTION_ID)
  const isUpNext = useIsSectionUpNext(SECTION_ID)
  // Gate the form on persist hydration so the form's `useState` initializer
  // (which derives initial mode from slice value) sees the truth, not the
  // pre-hydration default.
  const hasHydrated = usePropertyCreationHasHydrated()
  const taxIdValue = usePropertyCreationState(
    (s) => (s.sectionData['tax-id'] as TaxIdSectionInput).tax_id,
  )
  const countryCode = usePropertyCreationState(
    (s) => (s.sectionData.property as PropertyInput).country_code,
  )
  const summary = formatTaxIdSummary(taxIdValue, countryCode)

  return (
    <Section id={SECTION_ID} isActive={isActive} isUpNext={isUpNext} status={status}>
      <Section.Header ref={registerHeaderRef(SECTION_ID)}>
        <Section.Icon>
          <ICON />
        </Section.Icon>
        <Section.HeaderContent>
          <Section.Title>{tTaxId('title')}</Section.Title>
          <Section.Subtitle>{tTaxId('subtitle')}</Section.Subtitle>
          <Section.Summary>{summary}</Section.Summary>
        </Section.HeaderContent>
        <Section.Status
          doneLabel={t('status.done')}
          skippedLabel={t('status.skipped')}
          upNextLabel={t('status.upNext')}
        />
      </Section.Header>
      <Section.Body>
        {hasHydrated ? <TaxIdForm /> : <TaxIdFormFallback />}
      </Section.Body>
    </Section>
  )
}

function TaxIdFormFallback() {
  return <Skeleton className="h-12 w-full rounded-2xl" />
}

function TaxIdForm() {
  const t = useTranslations('propertyCreation.checkout')
  const tTaxId = useTranslations('propertyCreation.checkout.tax-id')
  const ctrl = useSectionController(SECTION_ID)
  const { setSectionData } = usePropertyCreationActions()
  const values = usePropertyCreationState(
    (s) => s.sectionData['tax-id'] as TaxIdSectionInput,
  )
  const countryCode = usePropertyCreationState(
    (s) => (s.sectionData.property as PropertyInput).country_code,
  )

  const validator = useMemo(
    () => zodValidator(getTaxIdInputSchema(countryCode)),
    [countryCode],
  )
  const form = useFormValidation({ values, validator })
  const { markTouched } = form

  // Mode is decided once per mount from the hydrated slice value. Mounting
  // empty → editable for the lifetime of this open; mounting with a value →
  // read-only with an explicit "change it" affordance. Closing/reopening the
  // section re-derives.
  const [isEditing, setIsEditing] = useState(() => values.tax_id === '')

  const setTaxId = useCallback(
    (next: string) => {
      setSectionData<TaxIdSectionInput>('tax-id', (prev) => ({
        ...prev,
        tax_id: next,
      }))
    },
    [setSectionData],
  )

  const handleChangeIt = useCallback(() => setIsEditing(true), [])

  const inputId = 'tax-id-input'
  const taxIdError = form.errors.tax_id?.[0]
  const hasError = form.hasError('tax_id')

  return (
    <>
      <WhyWeAskBlock countryCode={countryCode} />
      <FieldGroup>
        <Field data-invalid={hasError || undefined}>
          <TaxIdLabel
            htmlFor={inputId}
            countryCode={countryCode}
            mode="cpf-or-cnpj"
            value={values.tax_id}
          />
          <TaxIdInput
            id={inputId}
            countryCode={countryCode}
            mode="cpf-or-cnpj"
            value={values.tax_id}
            readOnly={!isEditing}
            aria-invalid={hasError}
            aria-describedby={
              hasError ? `${inputId}-error` : `${inputId}-description`
            }
            onValueChange={setTaxId}
            onBlur={() => markTouched('tax_id')}
          />
          {/* Description slot is always rendered with single-line text in both
              modes, so toggling read↔edit doesn't shift the surrounding layout. */}
          {isEditing ? (
            <FieldDescription id={`${inputId}-description`}>
              {tTaxId('editingDescription')}
            </FieldDescription>
          ) : (
            <FieldDescription id={`${inputId}-description`}>
              {tTaxId('editLinkPrompt')}{' '}
              <button
                type="button"
                className="text-primary hover:text-primary/80 underline-offset-2 hover:underline"
                onClick={handleChangeIt}
              >
                {tTaxId('editLinkAction')}
              </button>
            </FieldDescription>
          )}
          {hasError && taxIdError && (
            <FieldError id={`${inputId}-error`}>
              {tTaxId(`validation.${taxIdError}`)}
            </FieldError>
          )}
        </Field>
      </FieldGroup>
      <Section.Actions
        backLabel={t('actions.back')}
        continueLabel={t('actions.continue')}
        continueDisabled={!form.isValid}
        skipLabel={t('actions.skip')}
        showSkip={!ctrl.isRequired}
        onBack={ctrl.handleBack}
        onContinue={ctrl.handleContinue}
        onSkip={ctrl.handleSkip}
      />
    </>
  )
}

function WhyWeAskBlock({ countryCode }: { countryCode: string }) {
  const t = useTranslations('propertyCreation.checkout.tax-id.whyWeAsk')
  // Bullet 1 is country-specific (BR-only references "boleto"); other regions
  // fall back to a generic phrasing. Bullets 2 and 3 read the same everywhere.
  const trackingKey = countryCode === 'BR' ? 'bulletTrackingBR' : 'bulletTrackingFallback'

  const handlePrivacyClick = useCallback(() => {
    toast(t('privacyComingSoon'))
  }, [t])

  return (
    <section
      data-slot="why-we-ask"
      className="bg-muted/40 flex flex-col gap-3 rounded-2xl p-4 md:p-5"
    >
      <h4 className="text-foreground font-semibold">{t('title')}</h4>
      <ul className="text-foreground flex flex-col gap-2 text-sm">
        <li className="flex items-start gap-2">
          <Check aria-hidden className="text-primary mt-0.5 size-4 shrink-0" />
          <span>{t(trackingKey)}</span>
        </li>
        <li className="flex items-start gap-2">
          <Check aria-hidden className="text-primary mt-0.5 size-4 shrink-0" />
          <span>{t('bulletRouting')}</span>
        </li>
        <li className="flex items-start gap-2">
          <Check aria-hidden className="text-primary mt-0.5 size-4 shrink-0" />
          <span>{t('bulletDocuments')}</span>
        </li>
      </ul>
      <button
        type="button"
        onClick={handlePrivacyClick}
        className="text-primary hover:text-primary/80 self-start text-sm underline-offset-2 hover:underline"
      >
        {t('privacyLink')}
      </button>
    </section>
  )
}

export function TaxIdSectionSkeleton() {
  return <SectionSkeleton sectionId={SECTION_ID} icon={ICON} />
}

export function TaxIdSummaryRow() {
  const t = useTranslations('propertyCreation.checkout.tax-id')
  const taxIdValue = usePropertyCreationState(
    (s) => (s.sectionData['tax-id'] as TaxIdSectionInput).tax_id,
  )
  const countryCode = usePropertyCreationState(
    (s) => (s.sectionData.property as PropertyInput).country_code,
  )
  const detail = formatTaxIdSummary(taxIdValue, countryCode)
  
  return (
    <SummaryRow sectionId={SECTION_ID} title={t('title')} detail={detail || null} />
  )
}
