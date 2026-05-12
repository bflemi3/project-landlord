'use client'

import * as React from 'react'
import { useState, useCallback, useRef, useTransition, useEffect, createContext, useContext } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldRow,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { getAddressProvider } from '@/lib/address/provider'
import { validateProperty, type ValidatePropertyState } from '@/data/properties/actions/validate-property'
import type { PropertyInput } from '@/schemas/property'
import { CepField } from './cep-field'

const addressProvider = getAddressProvider('BR')

export type PropertyFormValues = PropertyInput

// =============================================================================
// Context — shares form state between parts
// =============================================================================

interface PropertyFormContext {
  initialValues?: PropertyFormValues
  errors: Record<string, readonly string[]>
  street: string
  setStreet: (v: string) => void
  neighborhood: string
  setNeighborhood: (v: string) => void
  city: string
  setCity: (v: string) => void
  addressState: string
  setAddressState: (v: string) => void
  addressStateRef: React.RefObject<string>
  handleAddressFound: (result: { street: string | null; neighborhood: string | null; city: string | null; state: string | null }) => void
  canContinue: boolean
  isChecking: boolean
}

const FormContext = createContext<PropertyFormContext | null>(null)

function useFormContext() {
  const ctx = useContext(FormContext)
  if (!ctx) throw new Error('PropertyForm parts must be used inside PropertyForm')
  return ctx
}

// =============================================================================
// Root — <form> tag with all state and logic
// =============================================================================

interface PropertyFormProps {
  onValidated: (values: PropertyFormValues) => void
  initialValues?: PropertyFormValues
  initialErrors?: ValidatePropertyState['errors']
  /** When editing, pass the property ID to exclude it from duplicate address checks */
  excludePropertyId?: string
  className?: string
  children: React.ReactNode
}

export function PropertyForm({ onValidated, initialValues, initialErrors, excludePropertyId, className, children }: PropertyFormProps) {
  const checkTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const addressStateRef = useRef(initialValues?.state ?? '')

  const t = useTranslations('properties')
  const router = useRouter()

  const [isChecking, startChecking] = useTransition()
  const [canContinue, setCanContinue] = useState(() => {
    if (!initialValues) return false
    return initialValues.postal_code.length >= 8 &&
      initialValues.street.length > 0 && initialValues.number.length > 0 &&
      initialValues.city.length > 0 && initialValues.state.length > 0
  })
  const [street, setStreet] = useState(initialValues?.street ?? '')
  const [neighborhood, setNeighborhood] = useState(initialValues?.neighborhood ?? '')
  const [city, setCity] = useState(initialValues?.city ?? '')
  const [addressState, setAddressState] = useState(initialValues?.state ?? '')
  const [errors, setErrors] = useState<Record<string, readonly string[]>>(initialErrors ?? {})

  useEffect(() => {
    return () => clearTimeout(checkTimerRef.current)
  }, [])

  function handleFormInput(e: React.FormEvent<HTMLFormElement>) {
    const form = e.currentTarget
    clearTimeout(checkTimerRef.current)
    checkTimerRef.current = setTimeout(() => {
      const val = (field: string) => (form.elements.namedItem(field) as HTMLInputElement)?.value.trim()
      setCanContinue(
        val('postal_code').replace(/\D/g, '').length === 8 &&
        val('street').length > 0 &&
        val('number').length > 0 &&
        val('city').length > 0 &&
        addressStateRef.current.length > 0,
      )
    }, 150)
  }

  const handleAddressFound = useCallback((result: { street: string | null; neighborhood: string | null; city: string | null; state: string | null }) => {
    if (result.street) setStreet(result.street)
    if (result.neighborhood) setNeighborhood(result.neighborhood)
    if (result.city) setCity(result.city)
    if (result.state) {
      setAddressState(result.state)
      addressStateRef.current = result.state
    }
  }, [])

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const val = (field: string) => (form.elements.namedItem(field) as HTMLInputElement)?.value.trim()

    const values: PropertyFormValues = {
      name: val('name'),
      postal_code: val('postal_code'),
      street: val('street'),
      number: val('number'),
      complement: val('complement'),
      neighborhood: val('neighborhood'),
      city: val('city'),
      state: addressState,
      country_code: 'BR',
      property_type: null,
    }

    startChecking(async () => {
      const result = await validateProperty(values, excludePropertyId)

      if (!result.valid) {
        if (result.existingPropertyId) {
          toast.warning(t('duplicateAddress'), {
            position: 'top-center',
            duration: Infinity,
            action: {
              label: t('viewExistingProperty'),
              onClick: () => router.push(`/app/p/${result.existingPropertyId}`),
            },
          })
          return
        }
        setErrors(result.errors ?? {})
        return
      }

      setErrors({})
      onValidated(values)
    })
  }

  const ctx: PropertyFormContext = {
    initialValues, errors, street, setStreet, neighborhood, setNeighborhood,
    city, setCity, addressState, setAddressState, addressStateRef,
    handleAddressFound, canContinue, isChecking,
  }

  return (
    <FormContext.Provider value={ctx}>
      <form onSubmit={handleSubmit} onInput={handleFormInput} className={cn('flex min-h-0 flex-1 flex-col', className)}>
        {children}
      </form>
    </FormContext.Provider>
  )
}

// =============================================================================
// Name — property name field, composable separately from Content
// =============================================================================

function PropertyFormName({ className, ...props }: React.ComponentProps<'div'>) {
  const t = useTranslations('properties')
  const { initialValues, errors } = useFormContext()

  return (
    <div data-slot="property-form-name" className={className} {...props}>
      <Field data-invalid={Boolean(errors.name?.[0]) || undefined}>
        <Label htmlFor="name">{t('propertyName')}</Label>
        <Input
          id="name"
          name="name"
          type="text"
          placeholder={t('propertyNamePlaceholder')}
          defaultValue={initialValues?.name ?? ''}
          autoFocus
          aria-invalid={Boolean(errors.name?.[0])}
          aria-describedby={errors.name?.[0] ? 'name-error' : 'name-hint'}
        />
        <FieldDescription id="name-hint">
          {t('propertyNameHint')}
        </FieldDescription>
        {errors.name?.[0] && (
          <FieldError id="name-error">{t(errors.name[0])}</FieldError>
        )}
      </Field>
    </div>
  )
}

// =============================================================================
// Content — address form fields
// =============================================================================

function PropertyFormContent({ className, ...props }: React.ComponentProps<'div'>) {
  const t = useTranslations('properties')
  const {
    initialValues, errors, street, setStreet, neighborhood, setNeighborhood,
    city, setCity, addressState, setAddressState, addressStateRef, handleAddressFound,
  } = useFormContext()

  return (
    <div data-slot="property-form-content" className={cn('flex flex-col gap-6', className)} {...props}>
      <Field data-invalid={Boolean(errors.postal_code?.[0]) || undefined}>
        <CepField
          onAddressFound={handleAddressFound}
          defaultValue={initialValues?.postal_code}
        />
        {errors.postal_code?.[0] && (
          <FieldError id="postal_code-error">
            {t(errors.postal_code[0])}
          </FieldError>
        )}
      </Field>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-sm font-medium text-muted-foreground">{t('addressSection')}</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <div className="flex flex-col gap-4">
        <FieldRow columns={3} breakpoint="md">
          <Field
            className="md:col-span-2"
            data-invalid={Boolean(errors.street?.[0]) || undefined}
          >
            <Label htmlFor="street">{t('street')}</Label>
            <Input
              id="street"
              name="street"
              type="text"
              placeholder={t('streetPlaceholder')}
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              aria-invalid={Boolean(errors.street?.[0])}
              aria-describedby={errors.street?.[0] ? 'street-error' : undefined}
            />
            {errors.street?.[0] && (
              <FieldError id="street-error">{t(errors.street[0])}</FieldError>
            )}
          </Field>

          <Field data-invalid={Boolean(errors.number?.[0]) || undefined}>
            <Label htmlFor="number">{t('number')}</Label>
            <Input
              id="number"
              name="number"
              type="text"
              placeholder={t('numberPlaceholder')}
              defaultValue={initialValues?.number}
              aria-invalid={Boolean(errors.number?.[0])}
              aria-describedby={errors.number?.[0] ? 'number-error' : undefined}
            />
            {errors.number?.[0] && (
              <FieldError id="number-error">{t(errors.number[0])}</FieldError>
            )}
          </Field>
        </FieldRow>

        <Field>
          <Label htmlFor="complement">{t('complement')}</Label>
          <Input
            id="complement"
            name="complement"
            type="text"
            placeholder={t('complementPlaceholder')}
            defaultValue={initialValues?.complement}
          />
        </Field>

        <Field>
          <Label htmlFor="neighborhood">{t('neighborhood')}</Label>
          <Input
            id="neighborhood"
            name="neighborhood"
            type="text"
            placeholder={t('neighborhoodPlaceholder')}
            value={neighborhood}
            onChange={(e) => setNeighborhood(e.target.value)}
          />
        </Field>

        <FieldRow columns={3} breakpoint="md">
          <Field
            className="md:col-span-2"
            data-invalid={Boolean(errors.city?.[0]) || undefined}
          >
            <Label htmlFor="city">{t('city')}</Label>
            <Input
              id="city"
              name="city"
              type="text"
              placeholder={t('cityPlaceholder')}
              value={city}
              onChange={(e) => setCity(e.target.value)}
              aria-invalid={Boolean(errors.city?.[0])}
              aria-describedby={errors.city?.[0] ? 'city-error' : undefined}
            />
            {errors.city?.[0] && (
              <FieldError id="city-error">{t(errors.city[0])}</FieldError>
            )}
          </Field>

          <Field data-invalid={Boolean(errors.state?.[0]) || undefined}>
            <Label htmlFor="state">{t('state')}</Label>
            <Select
              value={addressState}
              onValueChange={(val) => {
                setAddressState(val ?? '')
                addressStateRef.current = val ?? ''
              }}
            >
              <SelectTrigger
                id="state"
                aria-invalid={Boolean(errors.state?.[0])}
                aria-describedby={errors.state?.[0] ? 'state-error' : undefined}
              >
                <SelectValue placeholder={t('statePlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {addressProvider.states.map((s) => (
                  <SelectItem key={s.code} value={s.code}>{s.code} — {s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.state?.[0] && (
              <FieldError id="state-error">{t(errors.state[0])}</FieldError>
            )}
          </Field>
        </FieldRow>
      </div>

      {errors.general?.[0] && errors.general[0] !== 'duplicateAddress' && (
        <FieldError>{t(errors.general[0])}</FieldError>
      )}
    </div>
  )
}

// =============================================================================
// Footer — submit button
// =============================================================================

function PropertyFormFooter({ className, label, ...props }: React.ComponentProps<'div'> & { label?: string }) {
  const t = useTranslations('properties')
  const { canContinue, isChecking } = useFormContext()

  return (
    <div data-slot="property-form-footer" className={className} {...props}>
      <Button type="submit" className="h-12 w-full rounded-2xl" size="lg" disabled={!canContinue} loading={isChecking}>
        {label ?? t('continue')}
      </Button>
    </div>
  )
}

// =============================================================================
// Attach parts
// =============================================================================

PropertyForm.Name = PropertyFormName
PropertyForm.Content = PropertyFormContent
PropertyForm.Footer = PropertyFormFooter

export { PropertyFormName, PropertyFormContent, PropertyFormFooter }
