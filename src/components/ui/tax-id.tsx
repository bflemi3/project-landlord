'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'

import { FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { formatCpf } from '@/lib/cpf/format'

type TaxIdInputBaseProps = Omit<
  React.ComponentProps<typeof Input>,
  'type' | 'value' | 'onChange'
> & {
  value: string
  onValueChange: (value: string) => void
}

function BrazilTaxIdInput({
  value,
  onValueChange,
  ...props
}: TaxIdInputBaseProps) {
  return (
    <Input
      data-slot="tax-id-input"
      data-country="BR"
      type="text"
      inputMode="numeric"
      autoComplete="off"
      placeholder="000.000.000-00"
      maxLength={14}
      value={value}
      onChange={(e) => onValueChange(formatCpf(e.target.value))}
      {...props}
    />
  )
}

function FallbackTaxIdInput({
  value,
  onValueChange,
  ...props
}: TaxIdInputBaseProps) {
  return (
    <Input
      data-slot="tax-id-input"
      type="text"
      autoComplete="off"
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      {...props}
    />
  )
}

interface TaxIdInputProps extends TaxIdInputBaseProps {
  countryCode: string
}

function TaxIdInput({ countryCode, ...props }: TaxIdInputProps) {
  if (countryCode === 'BR') return <BrazilTaxIdInput {...props} />
  return <FallbackTaxIdInput {...props} />
}

interface TaxIdLabelProps extends React.ComponentProps<typeof FieldLabel> {
  countryCode: string
}

function TaxIdLabel({
  countryCode,
  children,
  ...props
}: TaxIdLabelProps) {
  const t = useTranslations('common')
  // BR's tax-id is "CPF" — a proper noun, identical across all locales.
  const labelText = countryCode === 'BR' ? 'CPF' : t('taxIdLabel')
  return (
    <FieldLabel data-slot="tax-id-label" {...props}>
      {labelText}
      {children}
    </FieldLabel>
  )
}

export {
  TaxIdInput,
  TaxIdLabel,
  BrazilTaxIdInput,
  FallbackTaxIdInput,
}
export type { TaxIdInputProps, TaxIdLabelProps }
