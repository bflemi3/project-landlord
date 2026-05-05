'use client'

import { useCallback, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Building2, Home, Briefcase, MoreHorizontal } from 'lucide-react'

import { CepField } from '@/components/forms/cep-field'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldRow,
  FieldSet,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RadioCardGroup, type RadioCardOption } from '@/components/radio-card-group'
import { getAddressProvider } from '@/lib/address/provider'
import { formatPropertyName } from '@/lib/address/format-property-name'
import type { AddressLookupResult } from '@/lib/address/types'
import { getPropertyInputSchema } from '@/schemas/property'
import { validateProperty } from '@/data/properties/actions/validate-property'
import { zodValidator, useFormValidation } from '@/lib/forms/use-form-validation'
import { useServerValidationErrors } from '@/lib/forms/use-server-validation-errors'
import { Constants } from '@/lib/types/database'

import type { SectionId } from '../../../state/registry'
import type { PropertyInput } from '../../../state/extraction-seeding'
import {
  usePropertyCreationActions,
  usePropertyCreationState,
  useIsExtracted,
} from '../../../state/use-property-creation'
import { useCheckoutContext } from '../checkout-context'
import { Section } from '../section'
import { useSectionController } from '../use-section-controller'
import { SectionSkeleton } from './section-skeleton'
import { SummaryRow } from './summary-row'
import { AutoFilledIndicator } from './auto-filled-indicator'

const SECTION_ID: SectionId = 'property'
const ICON = Building2

const PROPERTY_TYPE_OPTIONS = Constants.public.Enums.property_type

const PROPERTY_TYPE_ICONS: Record<(typeof PROPERTY_TYPE_OPTIONS)[number], React.ComponentType<{ className?: string }>> = {
  apartment: Building2,
  house: Home,
  commercial: Briefcase,
  other: MoreHorizontal,
}

type PropertyTypeValue = (typeof PROPERTY_TYPE_OPTIONS)[number]

const brStates = getAddressProvider('BR').states
const validator = zodValidator(getPropertyInputSchema('BR'))

export function PropertySection() {
  const t = useTranslations('propertyCreation.checkout')
  const tProperties = useTranslations('properties')
  const router = useRouter()
  const { registerHeaderRef } = useCheckoutContext()
  const { setSectionData } = usePropertyCreationActions()
  const values = usePropertyCreationState(
    (s) => s.sectionData.property as PropertyInput,
  )
  const form = useFormValidation({ values, validator })
  const { markTouched } = form
  const {
    setServerErrors,
    clearServerErrors,
    hasFieldError,
    getFieldError,
  } = useServerValidationErrors<PropertyInput>()

  const onBeforeContinue = useCallback(async () => {
    const result = await validateProperty(values)
    if (result.valid) {
      clearServerErrors()
      return true
    }

    setServerErrors(result.errors ?? {})

    if (result.existingPropertyId) {
      toast.warning(tProperties('duplicateAddress'), {
        position: 'top-center',
        duration: Infinity,
        action: {
          label: tProperties('viewExistingProperty'),
          onClick: () => router.push(`/app/p/${result.existingPropertyId}`),
        },
      })
    }
    return false
  }, [values, tProperties, router, clearServerErrors, setServerErrors])

  const ctrl = useSectionController(SECTION_ID, { isFirst: true, onBeforeContinue })

  const isPostalCodeExtracted = useIsExtracted('property.postal_code')
  const cepLabelExtra = useMemo(
    () => (isPostalCodeExtracted ? <AutoFilledIndicator path="property.postal_code" /> : null),
    [isPostalCodeExtracted],
  )

  const propertyTypeOptions = useMemo<RadioCardOption<PropertyTypeValue>[]>(
    () =>
      PROPERTY_TYPE_OPTIONS.map((opt) => ({
        value: opt,
        label: tProperties(`propertyTypeOptions.${opt}`),
        icon: PROPERTY_TYPE_ICONS[opt],
      })),
    [tProperties],
  )

  const namePlaceholder = useMemo(() => {
    const derived = formatPropertyName({
      street: values.street,
      number: values.number,
      complement: values.complement,
      country_code: values.country_code,
    })
    return derived.length > 0 ? derived : tProperties('propertyNamePlaceholder')
  }, [values.street, values.number, values.complement, values.country_code, tProperties])

  const sectionSummary = useMemo(() => {
    const address = formatPropertyName({
      street: values.street,
      number: values.number,
      complement: values.complement,
      country_code: values.country_code,
    })
    const type = values.property_type
      ? tProperties(`propertyTypeOptions.${values.property_type}`)
      : null
    return [type, address].filter(Boolean).join(' · ')
  }, [values.street, values.number, values.complement, values.country_code, values.property_type, tProperties])

  const handlePostalCodeChange = useCallback(
    (formatted: string) => {
      clearServerErrors('postal_code')
      setSectionData<PropertyInput>('property', (prev) => ({
        ...(prev as PropertyInput),
        postal_code: formatted,
      }))
      markTouched('postal_code')
    },
    [setSectionData, markTouched, clearServerErrors],
  )

  const handleAddressFound = useCallback(
    (result: AddressLookupResult) => {
      clearServerErrors('street', 'neighborhood', 'city', 'state')
      setSectionData<PropertyInput>('property', (prev) => {
        const base = prev as PropertyInput
        return {
          ...base,
          street: result.street ?? base.street,
          neighborhood: result.neighborhood ?? base.neighborhood,
          city: result.city ?? base.city,
          state: result.state ?? base.state,
        }
      })
    },
    [setSectionData, clearServerErrors],
  )

  // Per-field setter. Recreated each render — fine, since it's only consumed
  // by non-memoized children (Input / Select). Memoized children use the
  // stable callbacks above.
  function setField<K extends keyof PropertyInput>(
    key: K,
    next: PropertyInput[K],
  ) {
    clearServerErrors(key)
    setSectionData<PropertyInput>('property', (prev) => ({
      ...(prev as PropertyInput),
      [key]: next,
    }))
  }

  // 10. Return
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
          <Section.Title>{t('property.title')}</Section.Title>
          <Section.Subtitle>{t('property.subtitle')}</Section.Subtitle>
          <Section.Summary>{sectionSummary}</Section.Summary>
        </Section.HeaderContent>
        <Section.Status
          doneLabel={t('status.done')}
          skippedLabel={t('status.skipped')}
          upNextLabel={t('status.upNext')}
        />
      </Section.Header>
      <Section.Body>
        <FieldGroup>
          {/* 1. Property type */}
          <Field>
            <FieldLabel>
              {tProperties('propertyType')}
              <AutoFilledIndicator path="property.property_type" />
            </FieldLabel>
            <RadioCardGroup
              options={propertyTypeOptions}
              value={values.property_type}
              aria-label={tProperties('propertyType')}
              onValueChange={(val) =>
                setField('property_type', val as PropertyInput['property_type'])
              }
            />
          </Field>

          {/* 2. Property name */}
          <Field data-invalid={hasFieldError(form, 'name') || undefined}>
            <FieldLabel htmlFor="name">
              {tProperties('propertyName')}
            </FieldLabel>
            <FieldDescription id="name-hint">
                {tProperties('propertyNameHint')}
            </FieldDescription>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder={namePlaceholder}
              value={values.name}
              onChange={(e) => setField('name', e.target.value)}
              onBlur={() => form.markTouched('name')}
              aria-invalid={hasFieldError(form, 'name')}
              aria-describedby={hasFieldError(form, 'name') ? 'name-error' : 'name-hint'}
            />
            {hasFieldError(form, 'name') && (
              <FieldError id="name-error">
                {tProperties(getFieldError(form, 'name')!)}
              </FieldError>
            )}
          </Field>

          {/* 3. CEP */}
          <Field data-invalid={hasFieldError(form, 'postal_code') || undefined}>
            <CepField
              labelExtra={cepLabelExtra}
              value={values.postal_code}
              onValueChange={handlePostalCodeChange}
              onAddressFound={handleAddressFound}
            />
            {hasFieldError(form, 'postal_code') && (
              <FieldError id="postal_code-error">
                {tProperties(getFieldError(form, 'postal_code')!)}
              </FieldError>
            )}
          </Field>

          {/* 4. Street + Number */}
          <FieldSet>
            <FieldLegend className="sr-only">
              {tProperties('streetAddressGroupLegend')}
            </FieldLegend>
            <FieldRow columns={3} breakpoint="md">
              <Field
                className="md:col-span-2"
                data-invalid={hasFieldError(form, 'street') || undefined}
              >
                <FieldLabel htmlFor="street">
                  {tProperties('street')}
                  <AutoFilledIndicator path="property.street" />
                </FieldLabel>
                <Input
                  id="street"
                  name="street"
                  type="text"
                  placeholder={tProperties('streetPlaceholder')}
                  value={values.street}
                  onChange={(e) => setField('street', e.target.value)}
                  onBlur={() => form.markTouched('street')}
                  aria-invalid={hasFieldError(form, 'street')}
                  aria-describedby={hasFieldError(form, 'street') ? 'street-error' : undefined}
                />
                {hasFieldError(form, 'street') && (
                  <FieldError id="street-error">
                    {tProperties(getFieldError(form, 'street')!)}
                  </FieldError>
                )}
              </Field>

              <Field data-invalid={hasFieldError(form, 'number') || undefined}>
                <FieldLabel htmlFor="number">
                  {tProperties('number')}
                  <AutoFilledIndicator path="property.number" />
                </FieldLabel>
                <Input
                  id="number"
                  name="number"
                  type="text"
                  placeholder={tProperties('numberPlaceholder')}
                  value={values.number}
                  onChange={(e) => setField('number', e.target.value)}
                  onBlur={() => form.markTouched('number')}
                  aria-invalid={hasFieldError(form, 'number')}
                  aria-describedby={hasFieldError(form, 'number') ? 'number-error' : undefined}
                />
                {hasFieldError(form, 'number') && (
                  <FieldError id="number-error">
                    {tProperties(getFieldError(form, 'number')!)}
                  </FieldError>
                )}
              </Field>
            </FieldRow>
          </FieldSet>

          {/* 5. Complement */}
          <Field data-invalid={hasFieldError(form, 'complement') || undefined}>
            <FieldLabel htmlFor="complement">
              {tProperties('complement')}
              <AutoFilledIndicator path="property.complement" />
            </FieldLabel>
            <Input
              id="complement"
              name="complement"
              type="text"
              placeholder={tProperties('complementPlaceholder')}
              value={values.complement}
              onChange={(e) => setField('complement', e.target.value)}
              onBlur={() => form.markTouched('complement')}
              aria-invalid={hasFieldError(form, 'complement')}
              aria-describedby={hasFieldError(form, 'complement') ? 'complement-error' : undefined}
            />
            {hasFieldError(form, 'complement') && (
              <FieldError id="complement-error">
                {tProperties(getFieldError(form, 'complement')!)}
              </FieldError>
            )}
          </Field>

          {/* 6. Neighborhood */}
          <Field data-invalid={hasFieldError(form, 'neighborhood') || undefined}>
            <FieldLabel htmlFor="neighborhood">
              {tProperties('neighborhood')}
              <AutoFilledIndicator path="property.neighborhood" />
            </FieldLabel>
            <Input
              id="neighborhood"
              name="neighborhood"
              type="text"
              placeholder={tProperties('neighborhoodPlaceholder')}
              value={values.neighborhood}
              onChange={(e) => setField('neighborhood', e.target.value)}
              onBlur={() => form.markTouched('neighborhood')}
              aria-invalid={hasFieldError(form, 'neighborhood')}
              aria-describedby={hasFieldError(form, 'neighborhood') ? 'neighborhood-error' : undefined}
            />
            {hasFieldError(form, 'neighborhood') && (
              <FieldError id="neighborhood-error">
                {tProperties(getFieldError(form, 'neighborhood')!)}
              </FieldError>
            )}
          </Field>

          {/* 7. City + State */}
          <FieldSet>
            <FieldLegend className="sr-only">
              {tProperties('cityStateGroupLegend')}
            </FieldLegend>
            <FieldRow columns={3} breakpoint="md">
              <Field
                className="md:col-span-2"
                data-invalid={hasFieldError(form, 'city') || undefined}
              >
                <FieldLabel htmlFor="city">
                  {tProperties('city')}
                  <AutoFilledIndicator path="property.city" />
                </FieldLabel>
                <Input
                  id="city"
                  name="city"
                  type="text"
                  placeholder={tProperties('cityPlaceholder')}
                  value={values.city}
                  onChange={(e) => setField('city', e.target.value)}
                  onBlur={() => form.markTouched('city')}
                  aria-invalid={hasFieldError(form, 'city')}
                  aria-describedby={hasFieldError(form, 'city') ? 'city-error' : undefined}
                />
                {hasFieldError(form, 'city') && (
                  <FieldError id="city-error">
                    {tProperties(getFieldError(form, 'city')!)}
                  </FieldError>
                )}
              </Field>

              <Field data-invalid={hasFieldError(form, 'state') || undefined}>
                <FieldLabel htmlFor="state">
                  {tProperties('state')}
                  <AutoFilledIndicator path="property.state" />
                </FieldLabel>
                <Select
                  value={values.state}
                  onValueChange={(val) => {
                    setField('state', val ?? '')
                    form.markTouched('state')
                  }}
                >
                  <SelectTrigger
                    id="state"
                    onBlur={() => form.markTouched('state')}
                    aria-invalid={hasFieldError(form, 'state')}
                    aria-describedby={hasFieldError(form, 'state') ? 'state-error' : undefined}
                  >
                    <SelectValue placeholder={tProperties('statePlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {brStates.map((s) => (
                      <SelectItem key={s.code} value={s.code}>
                        {s.code} — {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {hasFieldError(form, 'state') && (
                  <FieldError id="state-error">
                    {tProperties(getFieldError(form, 'state')!)}
                  </FieldError>
                )}
              </Field>
            </FieldRow>
          </FieldSet>
        </FieldGroup>
        <Section.Actions
          backLabel={t('actions.back')}
          continueLabel={t('actions.continue')}
          continueDisabled={!form.isValid}
          continueLoading={ctrl.isContinuing}
          skipLabel={t('actions.skip')}
          showSkip={false}
          onBack={ctrl.handleBack}
          onContinue={ctrl.handleContinue}
          onSkip={ctrl.handleSkip}
        />
      </Section.Body>
    </Section>
  )
}

export function PropertySectionSkeleton({ active = false }: { active?: boolean }) {
  return <SectionSkeleton sectionId={SECTION_ID} icon={ICON} active={active} />
}

export function PropertySummaryRow() {
  const t = useTranslations('propertyCreation.checkout.property')
  const values = usePropertyCreationState(
    (s) => s.sectionData.property as PropertyInput,
  )
  
  const detail = formatPropertyName({
    street: values.street,
    number: values.number,
    country_code: values.country_code,
  })

  return (
    <SummaryRow
      sectionId={SECTION_ID}
      title={t('title')}
      detail={detail || null}
    />
  )
}
