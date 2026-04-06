'use client'

import * as React from 'react'
import { useState, useCallback, useRef, useTransition, useEffect, createContext, useContext } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { getAddressProvider } from '@/lib/address/provider'
import { validateProperty, type ValidatePropertyState } from '@/app/actions/properties/validate-property'
import { CepField } from './cep-field'

const addressProvider = getAddressProvider('BR')

export interface PropertyFormValues {
  name: string
  postal_code: string
  street: string
  number: string
  complement: string
  neighborhood: string
  city: string
  state: string
  country_code: string
}

// =============================================================================
// Context — shares form state between parts
// =============================================================================

interface PropertyFormContext {
  initialValues?: PropertyFormValues
  errors: Record<string, string>
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
  const [errors, setErrors] = useState<Record<string, string>>(initialErrors ?? {})

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
      <Label htmlFor="name" className="mb-2">{t('propertyName')}</Label>
      <Input
        id="name"
        name="name"
        type="text"
        placeholder={t('propertyNamePlaceholder')}
        defaultValue={initialValues?.name ?? ''}
        autoFocus
      />
      <p className="mt-1.5 text-xs text-muted-foreground">{t('propertyNameHint')}</p>
      {errors.name && (
        <p className="mt-1.5 text-sm text-destructive">{t(errors.name)}</p>
      )}
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
    <div data-slot="property-form-content" className={className} {...props}>
      <fieldset className="space-y-5">
        <CepField
          onAddressFound={handleAddressFound}
          defaultValue={initialValues?.postal_code}
        />
        {errors.postal_code && (
          <p className="-mt-3 text-sm text-destructive">{t(errors.postal_code)}</p>
        )}
      </fieldset>

      <fieldset>
        <div className="mt-6 mb-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs font-medium text-muted-foreground">{t('addressSection')}</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Label htmlFor="street" className="mb-2">{t('street')}</Label>
              <Input
                id="street"
                name="street"
                type="text"
                placeholder={t('streetPlaceholder')}
                value={street}
                onChange={(e) => setStreet(e.target.value)}
              />
              {errors.street && (
                <p className="mt-1.5 text-sm text-destructive">{t(errors.street)}</p>
              )}
            </div>
            <div>
              <Label htmlFor="number" className="mb-2">{t('number')}</Label>
              <Input
                id="number"
                name="number"
                type="text"
                placeholder={t('numberPlaceholder')}
                defaultValue={initialValues?.number}
              />
              {errors.number && (
                <p className="mt-1.5 text-sm text-destructive">{t(errors.number)}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="complement" className="mb-2">{t('complement')}</Label>
            <Input
              id="complement"
              name="complement"
              type="text"
              placeholder={t('complementPlaceholder')}
              defaultValue={initialValues?.complement}
            />
          </div>

          <div>
            <Label htmlFor="neighborhood" className="mb-2">{t('neighborhood')}</Label>
            <Input
              id="neighborhood"
              name="neighborhood"
              type="text"
              placeholder={t('neighborhoodPlaceholder')}
              value={neighborhood}
              onChange={(e) => setNeighborhood(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Label htmlFor="city" className="mb-2">{t('city')}</Label>
              <Input
                id="city"
                name="city"
                type="text"
                placeholder={t('cityPlaceholder')}
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
              {errors.city && (
                <p className="mt-1.5 text-sm text-destructive">{t(errors.city)}</p>
              )}
            </div>
            <div>
              <Label className="mb-2">{t('state')}</Label>
              <Select value={addressState} onValueChange={(val) => { setAddressState(val ?? ''); addressStateRef.current = val ?? '' }}>
                <SelectTrigger>
                  <SelectValue placeholder={t('statePlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {addressProvider.states.map((s) => (
                    <SelectItem key={s.code} value={s.code}>{s.code} — {s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.state && (
                <p className="mt-1.5 text-sm text-destructive">{t(errors.state)}</p>
              )}
            </div>
          </div>
        </div>

        {errors.general && errors.general !== 'duplicateAddress' && (
          <p className="mt-4 text-sm text-destructive">{t(errors.general)}</p>
        )}
      </fieldset>
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
