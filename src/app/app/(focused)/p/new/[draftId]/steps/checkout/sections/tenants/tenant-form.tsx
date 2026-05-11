'use client'

import { useCallback } from 'react'
import { useTranslations } from 'next-intl'

import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import {
  TenantFormEmail,
  TenantFormInviteToggle,
  TenantFormName,
} from '@/components/forms/tenant-form'
import { TaxIdInput, TaxIdLabel } from '@/components/ui/tax-id'

import type { PropertyInput } from '@/schemas/property'

import { type TenantRow } from './schemas'
import {
  usePropertyCreationActions,
  usePropertyCreationState,
} from '../../../../state/use-property-creation'
import { useWizardForm } from '../../../../state/use-wizard-form'
import {
  clearFieldFromTenantsServerErrors,
  type TenantsTouched,
} from './state'
import { validateTenants } from './validation'

interface TenantFormProps {
  id: string
  /** Focus the name field on mount — used after Add tenant. */
  autoFocus?: boolean
}

export function TenantForm({ id, autoFocus = false }: TenantFormProps) {
  const { setSectionData, setServerErrors } = usePropertyCreationActions()
  const t = useTranslations('propertyCreation.checkout.tenants')

  // Row-keyed server errors for this tenant. The submit action populates
  // `sectionServerErrors.tenants[rowId]` on failure; merged below at the
  // call site (`errors[field]?.[0] ?? rowServerErrors[field]?.[0]`).
  const rowServerErrors = usePropertyCreationState((s) => {
    const section = s.sectionServerErrors.tenants as
      | Record<string, Record<string, string[]>>
      | undefined
    return section?.[id] ?? {}
  })

  const tenant = usePropertyCreationState((s) =>
    (s.sectionData.tenants as TenantRow[]).find((row) => row.id === id),
  )
  // Tax-id schema is country-aware; track the property's country.
  const countryCode = usePropertyCreationState(
    (s) => (s.sectionData.property as PropertyInput).country_code,
  )
  const touchedFields = usePropertyCreationState((s) => {
    const sectionTouched = s.sectionTouched.tenants as TenantsTouched
    return sectionTouched[id]
  })

  // Cached parse — shared with the row badge and the section's Continue
  // gate. One parse per (slice, country) tuple regardless of consumer count.
  const parseResult = usePropertyCreationState((s) =>
    validateTenants(
      s.sectionData.tenants as TenantRow[],
      (s.sectionData.property as PropertyInput).country_code,
    ).perRow.get(id),
  )

  const { errors, setTouched } = useWizardForm({
    sectionId: 'tenants',
    parseResult,
    touched: touchedFields,
  })

  // Append a single field to this row's touched set. The form constructs
  // the updater inline since its shape (`Record<rowId, Set<fieldName>>`)
  // is the form's own concern — section-level helpers stay minimal.
  const touchField = useCallback(
    (field: keyof TenantRow) => {
      setTouched<TenantsTouched>((prev) => {
        if (prev[id]?.has(field)) return prev
        const next = new Set(prev[id] ?? [])
        next.add(field)
        return { ...prev, [id]: next }
      })
    },
    [setTouched, id],
  )

  const setField = useCallback(
    <K extends keyof TenantRow>(key: K, next: TenantRow[K]) => {
      setServerErrors('tenants', clearFieldFromTenantsServerErrors(id, key))
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
    [id, setSectionData, setServerErrors],
  )

  if (!tenant) return null

  const nameId = `tenant-${id}-name`
  const emailId = `tenant-${id}-email`
  const taxIdId = `tenant-${id}-tax-id`
  const inviteId = `tenant-${id}-invite`

  // `errors` is already touch-gated by the hook. Server-side row errors are
  // always shown when present, so they merge on top of the form's filtered
  // errors — same access pattern as flat sections.
  const nameError = errors.name?.[0] ?? rowServerErrors.name?.[0]
  const hasNameError = Boolean(nameError)
  const emailError = errors.email?.[0] ?? rowServerErrors.email?.[0]
  const hasEmailError = Boolean(emailError)
  const taxIdError = errors.taxId?.[0] ?? rowServerErrors.taxId?.[0]
  const hasTaxIdError = Boolean(taxIdError)

  return (
    <FieldGroup>
      <Field data-invalid={hasNameError || undefined}>
        <FieldLabel htmlFor={nameId}>{t('nameLabel')}</FieldLabel>
        <TenantFormName
          id={nameId}
          value={tenant.name}
          autoFocus={autoFocus}
          aria-invalid={hasNameError}
          aria-describedby={hasNameError ? `${nameId}-error` : undefined}
          onValueChange={(name) => setField('name', name)}
          onBlur={() => touchField('name')}
        />
        {hasNameError && (
          <FieldError id={`${nameId}-error`}>{t(nameError!)}</FieldError>
        )}
      </Field>
      <Field data-invalid={hasEmailError || undefined}>
        <FieldLabel htmlFor={emailId}>{t('emailLabel')}</FieldLabel>
        <TenantFormEmail
          id={emailId}
          value={tenant.email}
          aria-invalid={hasEmailError}
          aria-describedby={hasEmailError ? `${emailId}-error` : undefined}
          onValueChange={(email) => setField('email', email)}
          onBlur={() => touchField('email')}
        />
        {hasEmailError && (
          <FieldError id={`${emailId}-error`}>{t(emailError!)}</FieldError>
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
            // Toggling invite swaps the email-required rule — re-touch
            // email so its visibility refreshes.
            touchField('email')
          }}
        />
      </Field>
      <Field data-invalid={hasTaxIdError || undefined}>
        <TaxIdLabel
          htmlFor={taxIdId}
          countryCode={countryCode}
          className="text-muted-foreground text-sm font-normal"
        />
        <TaxIdInput
          id={taxIdId}
          countryCode={countryCode}
          value={tenant.taxId}
          aria-invalid={hasTaxIdError}
          aria-describedby={hasTaxIdError ? `${taxIdId}-error` : undefined}
          onValueChange={(taxId) => setField('taxId', taxId)}
          onBlur={() => touchField('taxId')}
        />
        {hasTaxIdError && (
          <FieldError id={`${taxIdId}-error`}>{t(taxIdError!)}</FieldError>
        )}
      </Field>
    </FieldGroup>
  )
}
