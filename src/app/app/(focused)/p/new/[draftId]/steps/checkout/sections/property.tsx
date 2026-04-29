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

import type { SectionId } from '../../../state/registry'
import type { PropertySectionInitialValues } from '../../../state/extraction-seeding'
import {
  usePropertyCreationActions,
  usePropertyCreationState,
} from '../../../state/use-property-creation'
import { useCheckoutContext } from '../checkout-context'
import { Section } from '../section'
import { useSectionController } from '../use-section-controller'
import { SectionSkeleton } from './section-skeleton'
import { SummaryRow } from './summary-row'

const SECTION_ID: SectionId = 'property'
const ICON = Building2

const PROPERTY_TYPE_OPTIONS = ['apartment', 'house', 'commercial', 'other'] as const

const brStates = getAddressProvider('BR').states

export function PropertySection() {
  // 2. Context
  const t = useTranslations('propertyCreation.checkout')
  const tProperties = useTranslations('properties')
  const { registerHeaderRef } = useCheckoutContext()
  const ctrl = useSectionController(SECTION_ID, { isFirst: true })

  const values = usePropertyCreationState(
    (s) => s.sectionData.property as PropertySectionInitialValues,
  )
  const { setSectionData } = usePropertyCreationActions()

  // 5. Derived — memoized so the placeholder string only recomputes when one
  // of its inputs changes (and so its identity is stable across unrelated
  // re-renders, e.g., a sibling section completing).
  const namePlaceholder = useMemo(() => {
    const derived = formatPropertyName({
      street: values.street,
      number: values.number,
      complement: values.complement,
      countryCode: values.country_code,
    })
    return derived.length > 0 ? derived : tProperties('propertyNamePlaceholder')
  }, [values.street, values.number, values.complement, values.country_code, tProperties])

  // 8. Callbacks. Pass-through to `setSectionData` (whose action ref is
  // stable across renders) — that keeps the dep array trivial. The CepField
  // is wrapped in `React.memo`, so its props need stable references to
  // benefit from memoization.
  const handlePostalCodeChange = useCallback(
    (formatted: string) => {
      setSectionData<PropertySectionInitialValues>('property', (prev) => ({
        ...(prev as PropertySectionInitialValues),
        postal_code: formatted,
      }))
    },
    [setSectionData],
  )

  const handleAddressFound = useCallback(
    (result: AddressLookupResult) => {
      setSectionData<PropertySectionInitialValues>('property', (prev) => {
        const base = prev as PropertySectionInitialValues
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
  function setField<K extends keyof PropertySectionInitialValues>(
    key: K,
    next: PropertySectionInitialValues[K],
  ) {
    setSectionData<PropertySectionInitialValues>('property', (prev) => ({
      ...(prev as PropertySectionInitialValues),
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
                  (val || null) as PropertySectionInitialValues['property_type'],
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
            />
            <p className="text-muted-foreground mt-1.5 text-sm">
              {tProperties('propertyNameHint')}
            </p>
          </div>

          {/* 3. CEP */}
          <CepField
            value={values.postal_code}
            onValueChange={handlePostalCodeChange}
            onAddressFound={handleAddressFound}
          />

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
            />
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
            />
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
            />
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
            />
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
            />
          </div>

          <div>
            <Label className="mb-2">{tProperties('state')}</Label>
            <Select
              value={values.state}
              onValueChange={(val) => setField('state', val ?? '')}
            >
              <SelectTrigger>
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
          </div>
        </div>
        <Section.Actions
          backLabel={t('actions.back')}
          continueLabel={t('actions.continue')}
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
