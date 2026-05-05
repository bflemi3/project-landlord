'use client'

import { useCallback, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Sparkles } from 'lucide-react'

import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import {
  TenantFormAvatar,
  TenantFormEmail,
  TenantFormInviteToggle,
  TenantFormName,
  TenantFormRemoveButton,
} from '@/components/forms/tenant-form'
import { TaxIdInput, TaxIdLabel } from '@/components/ui/tax-id'
import {
  useFormValidation,
  zodValidator,
} from '@/lib/forms/use-form-validation'

import type { PropertyInput } from '../../../state/extraction-seeding'
import {
  getTenantRowSchema,
  type TenantRow,
} from '../../../state/tenant-row-schema'
import {
  usePropertyCreationActions,
  usePropertyCreationState,
} from '../../../state/use-property-creation'

interface TenantFormProps {
  id: string
  /** Focus the name field on mount — used after Add tenant. */
  autoFocus?: boolean
}

export function TenantForm({ id, autoFocus = false }: TenantFormProps) {
  const t = useTranslations('propertyCreation.checkout.tenants')

  const tenant = usePropertyCreationState((s) =>
    (s.sectionData.tenants as TenantRow[]).find((row) => row.id === id),
  )
  // Tax-id schema is country-aware; track the property's country.
  const countryCode = usePropertyCreationState(
    (s) => (s.sectionData.property as PropertyInput).country_code,
  )
  const { setSectionData } = usePropertyCreationActions()

  const validator = useMemo(
    () => zodValidator(getTenantRowSchema(countryCode)),
    [countryCode],
  )

  // Fallback covers the post-removal render before unmount; early-returned below.
  const form = useFormValidation({
    values: tenant ?? FALLBACK_ROW,
    validator,
  })
  const { markTouched } = form

  const setField = useCallback(
    <K extends keyof TenantRow>(key: K, next: TenantRow[K]) => {
      setSectionData<TenantRow[]>('tenants', (prev) =>
        prev.map((row) => {
          if (row.id !== id) return row
          // Real edits drop the auto-filled flag; no-op re-types preserve it.
          const changed = row[key] !== next
          return {
            ...row,
            [key]: next,
            isExtracted: changed ? false : row.isExtracted,
          }
        }),
      )
    },
    [id, setSectionData],
  )

  const handleRemove = useCallback(() => {
    setSectionData<TenantRow[]>('tenants', (prev) =>
      prev.filter((row) => row.id !== id),
    )
  }, [id, setSectionData])

  if (!tenant) return null

  const nameId = `tenant-${id}-name`
  const emailId = `tenant-${id}-email`
  const taxIdId = `tenant-${id}-tax-id`
  const inviteId = `tenant-${id}-invite`

  const nameError = form.errors.name?.[0]
  const emailError = form.errors.email?.[0]
  const taxIdError = form.errors.taxId?.[0]

  return (
    <div className="flex items-start gap-4 pt-1">
      <div className="relative shrink-0">
        <TenantFormAvatar name={tenant.name} email={tenant.email} />
        {tenant.isExtracted && (
          <span
            className="bg-card ring-card absolute -top-1 -right-1 z-10 inline-flex size-4 items-center justify-center rounded-full ring-2"
            aria-hidden
          >
            <Sparkles className="text-primary size-3" />
          </span>
        )}
      </div>
      <FieldGroup className="flex-1">
        <Field data-invalid={form.hasError('name') || undefined}>
          <FieldLabel htmlFor={nameId}>{t('nameLabel')}</FieldLabel>
          <TenantFormName
            id={nameId}
            value={tenant.name}
            autoFocus={autoFocus}
            aria-invalid={form.hasError('name')}
            aria-describedby={
              form.hasError('name') ? `${nameId}-error` : undefined
            }
            onValueChange={(name) => setField('name', name)}
            onBlur={() => markTouched('name')}
          />
          {form.hasError('name') && nameError && (
            <FieldError id={`${nameId}-error`}>{t(nameError)}</FieldError>
          )}
        </Field>
        <Field data-invalid={form.hasError('email') || undefined}>
          <FieldLabel htmlFor={emailId}>{t('emailLabel')}</FieldLabel>
          <TenantFormEmail
            id={emailId}
            value={tenant.email}
            aria-invalid={form.hasError('email')}
            aria-describedby={
              form.hasError('email') ? `${emailId}-error` : undefined
            }
            onValueChange={(email) => setField('email', email)}
            onBlur={() => markTouched('email')}
          />
          {form.hasError('email') && emailError && (
            <FieldError id={`${emailId}-error`}>{t(emailError)}</FieldError>
          )}
        </Field>
        <Field orientation="horizontal">
          <FieldContent>
            <FieldLabel htmlFor={inviteId}>{t('inviteToggleLabel')}</FieldLabel>
            <FieldDescription>{t('inviteToggleHelper')}</FieldDescription>
          </FieldContent>
          <TenantFormInviteToggle
            id={inviteId}
            checked={tenant.inviteNow}
            onCheckedChange={(inviteNow) => {
              setField('inviteNow', inviteNow)
              // Toggling invite swaps the email-required rule — re-touch to refresh.
              markTouched('email')
            }}
          />
        </Field>
        <Field data-invalid={form.hasError('taxId') || undefined}>
          <TaxIdLabel
            htmlFor={taxIdId}
            countryCode={countryCode}
            className="text-muted-foreground text-sm font-normal"
          />
          <TaxIdInput
            id={taxIdId}
            countryCode={countryCode}
            value={tenant.taxId}
            aria-invalid={form.hasError('taxId')}
            aria-describedby={
              form.hasError('taxId') ? `${taxIdId}-error` : undefined
            }
            onValueChange={(taxId) => setField('taxId', taxId)}
            onBlur={() => markTouched('taxId')}
          />
          {form.hasError('taxId') && taxIdError && (
            <FieldError id={`${taxIdId}-error`}>{t(taxIdError)}</FieldError>
          )}
        </Field>
      </FieldGroup>
      <TenantFormRemoveButton
        aria-label={t('removeAriaLabel')}
        onClick={handleRemove}
      />
    </div>
  )
}

const FALLBACK_ROW: TenantRow = {
  id: '',
  name: '',
  email: '',
  taxId: '',
  inviteNow: false,
  isExtracted: false,
}
