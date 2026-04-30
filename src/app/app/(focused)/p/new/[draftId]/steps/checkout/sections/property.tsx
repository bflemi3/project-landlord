'use client'

import { useCallback, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Building2 } from 'lucide-react'

import { CepField } from '@/components/forms/cep-field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getAddressProvider } from '@/lib/address/provider'
import { formatPropertyName } from '@/lib/address/format-property-name'
import type { AddressLookupResult } from '@/lib/address/types'
import { propertySectionSchema } from '@/data/properties/property-section-schema'
import { zodValidator, useFormValidation } from '@/lib/forms/use-form-validation'
import { Constants } from '@/lib/types/database'

import type { SectionId } from '../../../state/registry'
import type { PropertySectionValues } from '../../../state/extraction-seeding'
import {
  usePropertyCreationActions,
  usePropertyCreationState,
} from '../../../state/use-property-creation'
import { useCheckoutContext } from '../checkout-context'
import { Section } from '../section'
import { useSectionController } from '../use-section-controller'
import { SectionSkeleton } from './section-skeleton'
import { SummaryRow } from './summary-row'
import { ErrorHint } from '@/components/forms/error-hint'

const SECTION_ID: SectionId = 'property'
const ICON = Building2

const PROPERTY_TYPE_OPTIONS = Constants.public.Enums.property_type

const brStates = getAddressProvider('BR').states
const validator = zodValidator(propertySectionSchema)

export function PropertySection() {
  const t = useTranslations('propertyCreation.checkout')
  const tProperties = useTranslations('properties')
  const { registerHeaderRef } = useCheckoutContext()
  const ctrl = useSectionController(SECTION_ID, { isFirst: true })
  const { setSectionData } = usePropertyCreationActions()
  const values = usePropertyCreationState(
    (s) => s.sectionData.property as PropertySectionValues,
  )

  const form = useFormValidation({ values, validator })

  const namePlaceholder = useMemo(() => {
    const derived = formatPropertyName({
      street: values.street,
      number: values.number,
      complement: values.complement,
      countryCode: values.country_code,
    })
    return derived.length > 0 ? derived : tProperties('propertyNamePlaceholder')
  }, [values.street, values.number, values.complement, values.country_code, tProperties])

  const handlePostalCodeChange = useCallback(
    (formatted: string) => {
      setSectionData<PropertySectionValues>('property', (prev) => ({
        ...(prev as PropertySectionValues),
        postal_code: formatted,
      }))
    },
    [setSectionData],
  )

  const handleAddressFound = useCallback(
    (result: AddressLookupResult) => {
      setSectionData<PropertySectionValues>('property', (prev) => {
        const base = prev as PropertySectionValues
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
  function setField<K extends keyof PropertySectionValues>(
    key: K,
    next: PropertySectionValues[K],
  ) {
    setSectionData<PropertySectionValues>('property', (prev) => ({
      ...(prev as PropertySectionValues),
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
        </Section.HeaderContent>
        <Section.Status
          doneLabel={t('status.done')}
          skippedLabel={t('status.skipped')}
          upNextLabel={t('status.upNext')}
        />
      </Section.Header>
      <Section.Body>
        <div className="flex flex-col gap-6">
          {/* 1. Property type */}
          <div>
            <Label htmlFor="property_type" className="mb-2">
              {tProperties('propertyType')}
            </Label>
            <Select
              value={values.property_type ?? ''}
              onValueChange={(val) =>
                setField(
                  'property_type',
                  (val || null) as PropertySectionValues['property_type'],
                )
              }
            >
              <SelectTrigger id="property_type">
                <SelectValue placeholder={tProperties('propertyTypeSelectPrompt')} />
              </SelectTrigger>
              <SelectContent>
                {PROPERTY_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {tProperties(`propertyTypeOptions.${opt}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 2. Property name */}
          <div>
            <Label htmlFor="name" className="mb-2">
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
              aria-describedby={form.hasError('name') ? 'name-error' : undefined}
            />
            {form.hasError('name') ? (
              <ErrorHint className="mt-1.5" field="name" error={tProperties(form.errors.name![0])} />
            ) : (
              <p className="text-muted-foreground mt-1.5 text-sm">
                {tProperties('propertyNameHint')}
              </p>
            )}
          </div>

          {/* 3. CEP */}
          <div>
            <CepField
              value={values.postal_code}
              onValueChange={(formatted) => {
                handlePostalCodeChange(formatted)
                form.markTouched('postal_code')
              }}
              onAddressFound={handleAddressFound}
            />
            {form.hasError('postal_code') && (
              <ErrorHint className="mt-1.5" field="postal_code" error={tProperties(form.errors.postal_code![0])} />
            )}
          </div>

          {/* 4. Street + Number */}
          <div>
            <Label htmlFor="street" className="mb-2">
              {tProperties('street')}
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
              <ErrorHint className="mt-1.5" field="street" error={tProperties(form.errors.street![0])} />
            )}
          </div>

          <div>
            <Label htmlFor="number" className="mb-2">
              {tProperties('number')}
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
              <ErrorHint className="mt-1.5" field="number" error={tProperties(form.errors.number![0])} />
            )}
          </div>

          {/* 5. Complement */}
          <div>
            <Label htmlFor="complement" className="mb-2">
              {tProperties('complement')}
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
              <ErrorHint className="mt-1.5" field="complement" error={tProperties(form.errors.complement![0])} />
            )}
          </div>

          {/* 6. Neighborhood */}
          <div>
            <Label htmlFor="neighborhood" className="mb-2">
              {tProperties('neighborhood')}
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
              <ErrorHint className="mt-1.5" field="neighborhood" error={tProperties(form.errors.neighborhood![0])} />
            )}
          </div>

          {/* 7. City + State */}
          <div>
            <Label htmlFor="city" className="mb-2">
              {tProperties('city')}
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
              <ErrorHint className="mt-1.5" field="city" error={tProperties(form.errors.city![0])} />
            )}
          </div>

          <div>
            <Label htmlFor="state" className="mb-2">
              {tProperties('state')}
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
              <ErrorHint className="mt-1.5" field="state" error={tProperties(form.errors.state![0])} />
            )}
          </div>
        </div>
        <Section.Actions
          backLabel={t('actions.back')}
          continueLabel={t('actions.continue')}
          continueDisabled={!form.isValid}
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
  return <SummaryRow sectionId={SECTION_ID} title={t('title')} />
}
