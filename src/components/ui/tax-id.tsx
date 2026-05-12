'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'

import { FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { detectTaxIdKindBR, formatTaxIdBR } from '@/lib/tax-id/br'
import { formatCnpj } from '@/lib/tax-id/cnpj/format'
import { formatCpf } from '@/lib/tax-id/cpf/format'

type TaxIdMode = 'cpf' | 'cnpj' | 'cpf-or-cnpj'

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
      data-kind="cpf"
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

function BrazilCnpjInput({
  value,
  onValueChange,
  ...props
}: TaxIdInputBaseProps) {
  return (
    <Input
      data-slot="tax-id-input"
      data-country="BR"
      data-kind="cnpj"
      type="text"
      inputMode="numeric"
      autoComplete="off"
      placeholder="00.000.000/0000-00"
      maxLength={18}
      value={value}
      onChange={(e) => onValueChange(formatCnpj(e.target.value))}
      {...props}
    />
  )
}

function BrazilCpfOrCnpjInput({
  value,
  onValueChange,
  ...props
}: TaxIdInputBaseProps) {
  return (
    <Input
      data-slot="tax-id-input"
      data-country="BR"
      data-kind="cpf-or-cnpj"
      type="text"
      inputMode="numeric"
      autoComplete="off"
      placeholder="000.000.000-00"
      maxLength={18}
      value={value}
      onChange={(e) => onValueChange(formatTaxIdBR(e.target.value))}
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
  mode?: TaxIdMode
}

function TaxIdInput({ countryCode, mode = 'cpf', ...props }: TaxIdInputProps) {
  if (countryCode === 'BR') {
    if (mode === 'cnpj') return <BrazilCnpjInput {...props} />
    if (mode === 'cpf-or-cnpj') return <BrazilCpfOrCnpjInput {...props} />
    return <BrazilTaxIdInput {...props} />
  }
  return <FallbackTaxIdInput {...props} />
}

interface TaxIdLabelProps extends React.ComponentProps<typeof FieldLabel> {
  countryCode: string
  mode?: TaxIdMode
  /** Required when `mode='cpf-or-cnpj'` — drives the responsive label between
   *  "CPF", "CNPJ", and the empty-state combined label. Ignored otherwise. */
  value?: string
}

function TaxIdLabel({
  countryCode,
  mode = 'cpf',
  value = '',
  children,
  ...props
}: TaxIdLabelProps) {
  const t = useTranslations('common')
  const labelText = resolveLabelText(countryCode, mode, value, t)
  return (
    <FieldLabel data-slot="tax-id-label" {...props}>
      {labelText}
      {children}
    </FieldLabel>
  )
}

// Kind → label mapping. Single source of truth for both static modes (cpf,
// cnpj) and the responsive cpf-or-cnpj mode after detection narrows the kind.
const BR_KIND_LABELS = { cpf: 'CPF', cnpj: 'CNPJ' } as const

function resolveLabelText(
  countryCode: string,
  mode: TaxIdMode,
  value: string,
  t: (key: string) => string,
): string {
  if (countryCode !== 'BR') return t('taxIdLabel')
  // Static modes are themselves the kind; the responsive mode defers to
  // detection on the current value.
  const kind = mode === 'cpf-or-cnpj' ? detectTaxIdKindBR(value) : mode
  return kind === 'unknown' ? t('taxIdLabelCpfOrCnpj') : BR_KIND_LABELS[kind]
}

export {
  TaxIdInput,
  TaxIdLabel,
  BrazilTaxIdInput,
  BrazilCnpjInput,
  BrazilCpfOrCnpjInput,
  FallbackTaxIdInput,
}
export type { TaxIdInputProps, TaxIdLabelProps, TaxIdMode }
