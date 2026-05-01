'use client'

import { useCallback, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Building2, Home, Briefcase, MoreHorizontal } from 'lucide-react'

import { CepField } from '@/components/forms/cep-field'
import { ErrorHint } from '@/components/forms/error-hint'
import { FieldHint } from '@/components/forms/field-hint'
import { FormRoot, FormFieldset, FormField } from '@/components/forms/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { getPropertyInputSchema } from '@/data/properties/schema-by-country'
import { validateProperty } from '@/data/properties/actions/validate-property'
import { zodValidator, useFormValidation } from '@/lib/forms/use-form-validation'
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

  const onBeforeContinue = useCallback(async () => {
    const result = await validateProperty(values)
    if (result.valid) return true

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
  }, [values, tProperties, router])

  const ctrl = useSectionController(SECTION_ID, { isFirst: true, onBeforeContinue })

  const form = useFormValidation({ values, validator })
  const { markTouched } = form

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
      setSectionData<PropertyInput>('property', (prev) => ({
        ...(prev as PropertyInput),
        postal_code: formatted,
      }))
      markTouched('postal_code')
    },
    [setSectionData, markTouched],
  )

  const handleAddressFound = useCallback(
    (result: AddressLookupResult) => {
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
    [setSectionData],
  )

  // Per-field setter. Recreated each render — fine, since it's only consumed
  // by non-memoized children (Input / Select). Memoized children use the
  // stable callbacks above.
  function setField<K extends keyof PropertyInput>(
    key: K,
    next: PropertyInput[K],
  ) {
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
        <FormRoot>
          {/* 1. Property type */}
          <FormField>
            <Label>
              {tProperties('propertyType')}
              <AutoFilledIndicator path="property.property_type" />
            </Label>
            <RadioCardGroup
              options={propertyTypeOptions}
              value={values.property_type}
              aria-label={tProperties('propertyType')}
              onValueChange={(val) =>
                setField('property_type', val as PropertyInput['property_type'])
              }
            />
          </FormField>

          {/* 2. Property name */}
          <FormField>
            <Label htmlFor="name">
              {tProperties('propertyName')}
            </Label>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder={namePlaceholder}
              value={values.name}
              onChange={(e) => setField('name', e.target.value)}
              onBlur={() => form.markTouched('name')}
              aria-invalid={form.hasError('name')}
              aria-describedby={form.hasError('name') ? 'name-error' : 'name-hint'}
            />
            {form.hasError('name') ? (
              <ErrorHint field="name" error={tProperties(form.errors.name![0])} />
            ) : (
              <FieldHint field="name">{tProperties('propertyNameHint')}</FieldHint>
            )}
          </FormField>

          {/* 3. CEP */}
          <FormField>
            <CepField
              labelExtra={cepLabelExtra}
              value={values.postal_code}
              onValueChange={handlePostalCodeChange}
              onAddressFound={handleAddressFound}
            />
            {form.hasError('postal_code') && (
              <ErrorHint field="postal_code" error={tProperties(form.errors.postal_code![0])} />
            )}
          </FormField>

          {/* 4. Street + Number */}
          <FormFieldset legend="Street address" columns={3}>
            <FormField className="md:col-span-2">
              <Label htmlFor="street">
                {tProperties('street')}
                <AutoFilledIndicator path="property.street" />
              </Label>
              <Input
                id="street"
                name="street"
                type="text"
                placeholder={tProperties('streetPlaceholder')}
                value={values.street}
                onChange={(e) => setField('street', e.target.value)}
                onBlur={() => form.markTouched('street')}
                aria-invalid={form.hasError('street')}
                aria-describedby={form.hasError('street') ? 'street-error' : undefined}
              />
              {form.hasError('street') && (
                <ErrorHint field="street" error={tProperties(form.errors.street![0])} />
              )}
            </FormField>

            <FormField>
              <Label htmlFor="number">
                {tProperties('number')}
                <AutoFilledIndicator path="property.number" />
              </Label>
              <Input
                id="number"
                name="number"
                type="text"
                placeholder={tProperties('numberPlaceholder')}
                value={values.number}
                onChange={(e) => setField('number', e.target.value)}
                onBlur={() => form.markTouched('number')}
                aria-invalid={form.hasError('number')}
                aria-describedby={form.hasError('number') ? 'number-error' : undefined}
              />
              {form.hasError('number') && (
                <ErrorHint field="number" error={tProperties(form.errors.number![0])} />
              )}
            </FormField>
          </FormFieldset>

          {/* 5. Complement */}
          <FormField>
            <Label htmlFor="complement">
              {tProperties('complement')}
              <AutoFilledIndicator path="property.complement" />
            </Label>
            <Input
              id="complement"
              name="complement"
              type="text"
              placeholder={tProperties('complementPlaceholder')}
              value={values.complement}
              onChange={(e) => setField('complement', e.target.value)}
              onBlur={() => form.markTouched('complement')}
              aria-invalid={form.hasError('complement')}
              aria-describedby={form.hasError('complement') ? 'complement-error' : undefined}
            />
            {form.hasError('complement') && (
              <ErrorHint field="complement" error={tProperties(form.errors.complement![0])} />
            )}
          </FormField>

          {/* 6. Neighborhood */}
          <FormField>
            <Label htmlFor="neighborhood">
              {tProperties('neighborhood')}
              <AutoFilledIndicator path="property.neighborhood" />
            </Label>
            <Input
              id="neighborhood"
              name="neighborhood"
              type="text"
              placeholder={tProperties('neighborhoodPlaceholder')}
              value={values.neighborhood}
              onChange={(e) => setField('neighborhood', e.target.value)}
              onBlur={() => form.markTouched('neighborhood')}
              aria-invalid={form.hasError('neighborhood')}
              aria-describedby={form.hasError('neighborhood') ? 'neighborhood-error' : undefined}
            />
            {form.hasError('neighborhood') && (
              <ErrorHint field="neighborhood" error={tProperties(form.errors.neighborhood![0])} />
            )}
          </FormField>

          {/* 7. City + State */}
          <FormFieldset legend="City and state" columns={3}>
            <FormField className="md:col-span-2">
              <Label htmlFor="city">
                {tProperties('city')}
                <AutoFilledIndicator path="property.city" />
              </Label>
              <Input
                id="city"
                name="city"
                type="text"
                placeholder={tProperties('cityPlaceholder')}
                value={values.city}
                onChange={(e) => setField('city', e.target.value)}
                onBlur={() => form.markTouched('city')}
                aria-invalid={form.hasError('city')}
                aria-describedby={form.hasError('city') ? 'city-error' : undefined}
              />
              {form.hasError('city') && (
                <ErrorHint field="city" error={tProperties(form.errors.city![0])} />
              )}
            </FormField>

            <FormField>
              <Label htmlFor="state">
                {tProperties('state')}
                <AutoFilledIndicator path="property.state" />
              </Label>
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
                  aria-invalid={form.hasError('state')}
                  aria-describedby={form.hasError('state') ? 'state-error' : undefined}
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
              {form.hasError('state') && (
                <ErrorHint field="state" error={tProperties(form.errors.state![0])} />
              )}
            </FormField>
          </FormFieldset>
        </FormRoot>
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
