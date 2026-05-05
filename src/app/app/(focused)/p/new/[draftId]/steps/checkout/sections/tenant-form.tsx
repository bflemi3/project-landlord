'use client'

import { useTranslations } from 'next-intl'

import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import {
  TenantFormAvatar,
  TenantFormEmail,
  TenantFormInviteToggle,
  TenantFormName,
  TenantFormRemoveButton,
  TenantFormTaxId,
} from '@/components/forms/tenant-form'

import type { TenantRow } from '../../../state/tenant-row-schema'

interface TenantFormProps {
  tenant: TenantRow
  onChange: (tenant: TenantRow) => void
  onRemove?: () => void
}

export function TenantForm({ tenant, onChange, onRemove }: TenantFormProps) {
  const t = useTranslations('propertyCreation.checkout.tenants')

  const nameId = `tenant-${tenant.id}-name`
  const emailId = `tenant-${tenant.id}-email`
  const taxIdId = `tenant-${tenant.id}-tax-id`
  const inviteId = `tenant-${tenant.id}-invite`

  return (
    <div className="flex items-start gap-4 pt-1">
      <TenantFormAvatar name={tenant.name} email={tenant.email} />
      <FieldGroup className="flex-1">
        <Field>
          <FieldLabel htmlFor={nameId}>{t('nameLabel')}</FieldLabel>
          <TenantFormName
            id={nameId}
            value={tenant.name}
            onValueChange={(name) => onChange({ ...tenant, name })}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={emailId}>{t('emailLabel')}</FieldLabel>
          <TenantFormEmail
            id={emailId}
            value={tenant.email}
            onValueChange={(email) => onChange({ ...tenant, email })}
          />
        </Field>
        <Field orientation="horizontal">
          <FieldContent>
            <FieldLabel htmlFor={inviteId}>{t('inviteToggleLabel')}</FieldLabel>
            <FieldDescription>{t('inviteToggleHelper')}</FieldDescription>
          </FieldContent>
          <TenantFormInviteToggle
            id={inviteId}
            checked={tenant.inviteNow}
            onCheckedChange={(inviteNow) => onChange({ ...tenant, inviteNow })}
          />
        </Field>
        <Field>
          <FieldLabel
            htmlFor={taxIdId}
            className="text-muted-foreground text-sm font-normal"
          >
            {t('taxIdLabel')}
          </FieldLabel>
          <TenantFormTaxId
            id={taxIdId}
            value={tenant.taxId}
            onValueChange={(taxId) => onChange({ ...tenant, taxId })}
          />
        </Field>
      </FieldGroup>
      {onRemove && (
        <TenantFormRemoveButton
          aria-label={t('removeAriaLabel')}
          onClick={onRemove}
        />
      )}
    </div>
  )
}
