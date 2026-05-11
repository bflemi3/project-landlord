'use client'

import { useCallback, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { CreditCard } from 'lucide-react'
import { toast } from 'sonner'

import {
  ExplainerCard,
  ExplainerCardAction,
  ExplainerCardContent,
  ExplainerCardList,
  ExplainerCardListItem,
  ExplainerCardTitle,
} from '@/components/explainer-card'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
} from '@/components/ui/field'
import { Skeleton } from '@/components/ui/skeleton'
import { TaxIdInput, TaxIdLabel } from '@/components/ui/tax-id'
import { detectTaxIdKindBR } from '@/lib/tax-id/br'

import type { PropertyInput } from '@/schemas/property'

import type { SectionId } from '../../../../state/registry'
import { type TaxIdInput as TaxIdSectionInput } from './schemas'
import {
  clearFieldServerError,
  setAllTouched,
  type TaxIdSectionTouched,
  type TaxIdServerErrors,
} from './state'
import { validateTaxId as validateTaxIdParse } from './validation'
import {
  usePropertyCreationActions,
  usePropertyCreationHasHydrated,
  usePropertyCreationState,
} from '../../../../state/use-property-creation'
import { useCheckoutContext } from '../../checkout-context'
import { Section } from '../../section'
import { SectionSkeleton } from '../section-skeleton'
import { SummaryRow } from '../summary-row'
import { useWizardForm } from '../../../../state/use-wizard-form'

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
  const { setTouched } = usePropertyCreationActions()
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
  const summary = useMemo(() => formatTaxIdSummary(taxIdValue, countryCode), [taxIdValue, countryCode])

  const promoteAllTouched = useCallback(() => {
    setTouched<TaxIdSectionTouched>(SECTION_ID, (prev) => setAllTouched(prev))
  }, [setTouched])

  // Only auto-promote touched on first visit when extraction populated the
  // section (contract path). Tax-id itself is seeded from the profile, not
  // extraction — but the user-experience rule is the same: don't yell at
  // the no-contract user before they engage.
  const path = usePropertyCreationState((s) => s.path)
  const onFirstVisit = path === 'contract' ? promoteAllTouched : undefined

  return (
    <Section
      id={SECTION_ID}
      onFirstVisit={onFirstVisit}
      onLeave={promoteAllTouched}
    >
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
          needsAttentionLabel={t('status.needsAttention')}
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
  const { setSectionData, setServerErrors } = usePropertyCreationActions()
  const values = usePropertyCreationState(
    (s) => s.sectionData['tax-id'] as TaxIdSectionInput,
  )
  const countryCode = usePropertyCreationState(
    (s) => (s.sectionData.property as PropertyInput).country_code,
  )

  const touched = usePropertyCreationState(
    (s) => s.sectionTouched['tax-id'] as TaxIdSectionTouched,
  )
  // Cached parse — shared with section status and summary panel.
  const parseResult = usePropertyCreationState((s) =>
    validateTaxIdParse(
      s.sectionData['tax-id'] as TaxIdSectionInput,
      (s.sectionData.property as PropertyInput).country_code,
    ),
  )
  const { errors, isValid, setTouched } = useWizardForm({
    sectionId: 'tax-id',
    parseResult,
    touched,
  })
  const serverErrors = usePropertyCreationState(
    (s) => (s.sectionServerErrors['tax-id'] ?? {}) as TaxIdServerErrors,
  )

  // Mode is decided once per mount from the hydrated slice value. Mounting
  // empty → editable for the lifetime of this open; mounting with a value →
  // read-only with an explicit "change it" affordance. Closing/reopening the
  // section re-derives.
  const [isEditing, setIsEditing] = useState(() => values.tax_id === '')

  const setTaxId = useCallback(
    (next: string) => {
      setServerErrors('tax-id', clearFieldServerError('tax_id'))
      setSectionData<TaxIdSectionInput>('tax-id', (prev) => ({
        ...prev,
        tax_id: next,
      }))
    },
    [setSectionData, setServerErrors],
  )

  const touchTaxId = useCallback(() => {
    setTouched<TaxIdSectionTouched>((prev) => {
      if (prev.has('tax_id')) return prev
      const next = new Set(prev)
      next.add('tax_id')
      return next
    })
  }, [setTouched])

  const handleChangeIt = useCallback(() => setIsEditing(true), [])

  const inputId = 'tax-id-input'
  // `errors` is touch-gated by the hook; `serverErrors` is not. The merge
  // mirrors the property / rent-dates sections — local validation wins when
  // present, server errors surface otherwise (and stay visible until the
  // user edits the field, at which point `setTaxId` clears the slice).
  const taxIdError = errors.tax_id?.[0] ?? serverErrors.tax_id?.[0]
  const hasError = Boolean(taxIdError)

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
            onBlur={touchTaxId}
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
        continueDisabled={!isValid}
        skipLabel={t('actions.skip')}
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
    <ExplainerCard>
      <ExplainerCardTitle>{t('title')}</ExplainerCardTitle>
      <ExplainerCardContent>
        <ExplainerCardList>
          <ExplainerCardListItem>{t(trackingKey)}</ExplainerCardListItem>
          <ExplainerCardListItem>{t('bulletRouting')}</ExplainerCardListItem>
          <ExplainerCardListItem>{t('bulletDocuments')}</ExplainerCardListItem>
        </ExplainerCardList>
      </ExplainerCardContent>
      <ExplainerCardAction>
        <button
          type="button"
          onClick={handlePrivacyClick}
          className="text-primary hover:text-primary/80 text-sm underline-offset-2 hover:underline"
        >
          {t('privacyLink')}
        </button>
      </ExplainerCardAction>
    </ExplainerCard>
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
