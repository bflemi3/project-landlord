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
import { type PropertyInput } from '@/schemas/property'
import { validatePropertyForCheckout } from '../../../../state/actions/validate-property-for-checkout'
import { useWizardForm } from '../../../../state/use-wizard-form'
import { Constants } from '@/lib/types/database'

import type { SectionId } from '../../../../state/registry'
import {
  usePropertyCreationActions,
  usePropertyCreationState,
  usePropertyCreationStoreApi,
  useIsExtracted,
} from '../../../../state/use-property-creation'
import { setAllTouched, type PropertyTouched } from './state'
import { validateProperty as validatePropertyParse } from './validation'
import { useCheckoutContext } from '../../checkout-context'
import { Section } from '../../section'
import { SectionSkeleton } from '../section-skeleton'
import { SummaryRow } from '../summary-row'
import { AutoFilledIndicator } from '../auto-filled-indicator'

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
type PropertyField = keyof PropertyInput

const brStates = getAddressProvider('BR').states

export function PropertySection() {
  const t = useTranslations('propertyCreation.checkout')
  const tProperties = useTranslations('properties')
  const router = useRouter()
  const { registerHeaderRef } = useCheckoutContext()
  const {
    setSectionData,
    applyServerErrorsResponse,
    clearFieldServerError,
  } = usePropertyCreationActions()
  const storeApi = usePropertyCreationStoreApi()
  const values = usePropertyCreationState(
    (s) => s.sectionData.property as PropertyInput,
  )
  const touched = usePropertyCreationState(
    (s) => s.sectionTouched.property as PropertyTouched,
  )
  // Cached parse — shared with the section's status badge and summary panel.
  const parseResult = usePropertyCreationState((s) => {
    const slice = s.sectionData.property as PropertyInput | undefined
    return validatePropertyParse(slice, slice?.country_code ?? 'BR')
  })
  const { errors, isValid, setTouched } = useWizardForm({
    sectionId: 'property',
    parseResult,
    touched,
  })

  const promoteAllTouched = useCallback(() => {
    setTouched<PropertyTouched>((prev) => setAllTouched(prev))
  }, [setTouched])
  // Server-side errors now read from the persisted store slice. The merge
  // expression below (`errors[field]?.[0] ?? serverErrors[field]?.[0]`) is
  // unchanged — only the source has moved from local React state to Zustand.
  const serverErrors = usePropertyCreationState(
    (s) => (s.sectionServerErrors.property ?? {}) as Record<string, string[]>,
  )

  // Append a single field to the section's touched set. The form constructs
  // the updater inline since its shape (a `Set<string>`) is the form's own
  // concern — section-level helpers stay minimal.
  const markTouched = useCallback(
    (field: PropertyField) => {
      setTouched<PropertyTouched>((prev) => {
        if (prev.has(field)) return prev
        const next = new Set(prev)
        next.add(field)
        return next
      })
    },
    [setTouched],
  )

  // `form.errors` is already touch-gated by the hook. Server-side errors
  // (from `validatePropertyForCheckout`) are always shown when present, so
  // they merge on top of the form's filtered errors.
  const fieldError = useCallback(
    (field: PropertyField) => errors[field]?.[0] ?? serverErrors[field]?.[0],
    [errors, serverErrors],
  )

  // Read values via storeApi so the callback identity is stable across
  // keystrokes — closing over the `values` selector would recreate this
  // function on every edit, cascading recomputes through Section.Actions.
  const onBeforeContinue = useCallback(async () => {
    const slice = storeApi.getState().sectionData.property as PropertyInput
    const result = await validatePropertyForCheckout(slice)
    applyServerErrorsResponse(result)
    if (result.ok) return true

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
  }, [storeApi, tProperties, router, applyServerErrorsResponse])

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
      clearFieldServerError('property', 'postal_code')
      setSectionData<PropertyInput>('property', (prev) => ({
        ...(prev as PropertyInput),
        postal_code: formatted,
      }))
      markTouched('postal_code')
    },
    [setSectionData, markTouched, clearFieldServerError],
  )

  const handleAddressFound = useCallback(
    (result: AddressLookupResult) => {
      clearFieldServerError('property', 'street')
      clearFieldServerError('property', 'neighborhood')
      clearFieldServerError('property', 'city')
      clearFieldServerError('property', 'state')
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
    [setSectionData, clearFieldServerError],
  )

  // Per-field setter. Recreated each render — fine, since it's only consumed
  // by non-memoized children (Input / Select). Memoized children use the
  // stable callbacks above.
  function setField<K extends keyof PropertyInput>(
    key: K,
    next: PropertyInput[K],
  ) {
    clearFieldServerError('property', key)
    setSectionData<PropertyInput>('property', (prev) => ({
      ...(prev as PropertyInput),
      [key]: next,
    }))
  }

  const propertyTypeError = fieldError('property_type')
  const hasPropertyTypeError = Boolean(propertyTypeError)
  const nameError = fieldError('name')
  const hasNameError = Boolean(nameError)
  const postalCodeError = fieldError('postal_code')
  const hasPostalCodeError = Boolean(postalCodeError)
  const streetError = fieldError('street')
  const hasStreetError = Boolean(streetError)
  const numberError = fieldError('number')
  const hasNumberError = Boolean(numberError)
  const complementError = fieldError('complement')
  const hasComplementError = Boolean(complementError)
  const neighborhoodError = fieldError('neighborhood')
  const hasNeighborhoodError = Boolean(neighborhoodError)
  const cityError = fieldError('city')
  const hasCityError = Boolean(cityError)
  const stateError = fieldError('state')
  const hasStateError = Boolean(stateError)

  // 10. Return
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
          <Section.Title>{t('property.title')}</Section.Title>
          <Section.Subtitle>{t('property.subtitle')}</Section.Subtitle>
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
          {/* 1. Property type */}
          <Field data-invalid={hasPropertyTypeError || undefined}>
            <FieldLabel>
              {tProperties('propertyType')}
              <AutoFilledIndicator path="property.property_type" />
            </FieldLabel>
            <RadioCardGroup
              options={propertyTypeOptions}
              value={values.property_type}
              aria-label={tProperties('propertyType')}
              aria-invalid={hasPropertyTypeError}
              aria-describedby={hasPropertyTypeError ? 'property-type-error' : undefined}
              onValueChange={(val) => {
                setField('property_type', val as PropertyInput['property_type'])
                markTouched('property_type')
              }}
            />
            {hasPropertyTypeError && (
              <FieldError id="property-type-error">
                {tProperties(propertyTypeError!)}
              </FieldError>
            )}
          </Field>

          {/* 2. Property name */}
          <Field data-invalid={hasNameError || undefined}>
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
              onBlur={() => markTouched('name')}
              aria-invalid={hasNameError}
              aria-describedby={hasNameError ? 'name-error' : 'name-hint'}
            />
            {hasNameError && (
              <FieldError id="name-error">
                {tProperties(nameError!)}
              </FieldError>
            )}
          </Field>

          {/* 3. CEP */}
          <Field data-invalid={hasPostalCodeError || undefined}>
            <CepField
              labelExtra={cepLabelExtra}
              value={values.postal_code}
              onValueChange={handlePostalCodeChange}
              onAddressFound={handleAddressFound}
            />
            {hasPostalCodeError && (
              <FieldError id="postal_code-error">
                {tProperties(postalCodeError!)}
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
                data-invalid={hasStreetError || undefined}
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
                  onBlur={() => markTouched('street')}
                  aria-invalid={hasStreetError}
                  aria-describedby={hasStreetError ? 'street-error' : undefined}
                />
                {hasStreetError && (
                  <FieldError id="street-error">
                    {tProperties(streetError!)}
                  </FieldError>
                )}
              </Field>

              <Field data-invalid={hasNumberError || undefined}>
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
                  onBlur={() => markTouched('number')}
                  aria-invalid={hasNumberError}
                  aria-describedby={hasNumberError ? 'number-error' : undefined}
                />
                {hasNumberError && (
                  <FieldError id="number-error">
                    {tProperties(numberError!)}
                  </FieldError>
                )}
              </Field>
            </FieldRow>
          </FieldSet>

          {/* 5. Complement */}
          <Field data-invalid={hasComplementError || undefined}>
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
              onBlur={() => markTouched('complement')}
              aria-invalid={hasComplementError}
              aria-describedby={hasComplementError ? 'complement-error' : undefined}
            />
            {hasComplementError && (
              <FieldError id="complement-error">
                {tProperties(complementError!)}
              </FieldError>
            )}
          </Field>

          {/* 6. Neighborhood */}
          <Field data-invalid={hasNeighborhoodError || undefined}>
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
              onBlur={() => markTouched('neighborhood')}
              aria-invalid={hasNeighborhoodError}
              aria-describedby={hasNeighborhoodError ? 'neighborhood-error' : undefined}
            />
            {hasNeighborhoodError && (
              <FieldError id="neighborhood-error">
                {tProperties(neighborhoodError!)}
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
                data-invalid={hasCityError || undefined}
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
                  onBlur={() => markTouched('city')}
                  aria-invalid={hasCityError}
                  aria-describedby={hasCityError ? 'city-error' : undefined}
                />
                {hasCityError && (
                  <FieldError id="city-error">
                    {tProperties(cityError!)}
                  </FieldError>
                )}
              </Field>

              <Field data-invalid={hasStateError || undefined}>
                <FieldLabel htmlFor="state">
                  {tProperties('state')}
                  <AutoFilledIndicator path="property.state" />
                </FieldLabel>
                <Select
                  value={values.state}
                  onValueChange={(val) => {
                    setField('state', val ?? '')
                    markTouched('state')
                  }}
                >
                  <SelectTrigger
                    id="state"
                    onBlur={() => markTouched('state')}
                    aria-invalid={hasStateError}
                    aria-describedby={hasStateError ? 'state-error' : undefined}
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
                {hasStateError && (
                  <FieldError id="state-error">
                    {tProperties(stateError!)}
                  </FieldError>
                )}
              </Field>
            </FieldRow>
          </FieldSet>
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
