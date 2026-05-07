import { describe, it, expect, afterEach, vi } from 'vitest'
import { useState } from 'react'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import {
  TaxIdInput,
  TaxIdLabel,
  type TaxIdMode,
} from '../tax-id'

const enMessages = JSON.parse(
  readFileSync(resolve(process.cwd(), 'messages/en.json'), 'utf8'),
) as Record<string, unknown>

afterEach(cleanup)

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      {ui}
    </NextIntlClientProvider>,
  )
}

// Controlled wrapper so we can both observe onValueChange and rerender with
// the resulting value (which is what the formatter returns). This mirrors how
// the wizard's TenantForm consumes the primitive — formatter result flows
// straight back as the next value.
function ControlledTaxIdInput({
  countryCode,
  mode,
  onValueChange,
}: {
  countryCode: string
  mode?: TaxIdMode
  onValueChange?: (next: string) => void
}) {
  const [value, setValue] = useState('')
  return (
    <TaxIdInput
      data-testid="taxid-input"
      countryCode={countryCode}
      mode={mode}
      value={value}
      onValueChange={(next) => {
        setValue(next)
        onValueChange?.(next)
      }}
    />
  )
}

function getInput() {
  return screen.getByTestId('taxid-input') as HTMLInputElement
}

// =============================================================================
// TaxIdInput — mode dispatch + formatter wiring
// =============================================================================

describe('TaxIdInput — BR mode dispatch', () => {
  it('cpf mode formats input through formatCpf', () => {
    const onValueChange = vi.fn()
    renderWithIntl(
      <ControlledTaxIdInput
        countryCode="BR"
        mode="cpf"
        onValueChange={onValueChange}
      />,
    )
    fireEvent.change(getInput(), { target: { value: '04003232909' } })
    expect(onValueChange).toHaveBeenLastCalledWith('040.032.329-09')
    expect(getInput()).toHaveAttribute('data-kind', 'cpf')
  })

  it('cnpj mode formats input through formatCnpj', () => {
    const onValueChange = vi.fn()
    renderWithIntl(
      <ControlledTaxIdInput
        countryCode="BR"
        mode="cnpj"
        onValueChange={onValueChange}
      />,
    )
    fireEvent.change(getInput(), { target: { value: '11222333000181' } })
    expect(onValueChange).toHaveBeenLastCalledWith('11.222.333/0001-81')
    expect(getInput()).toHaveAttribute('data-kind', 'cnpj')
  })

  it('cpf-or-cnpj mode dispatches to CPF mask for ≤11 digits', () => {
    const onValueChange = vi.fn()
    renderWithIntl(
      <ControlledTaxIdInput
        countryCode="BR"
        mode="cpf-or-cnpj"
        onValueChange={onValueChange}
      />,
    )
    fireEvent.change(getInput(), { target: { value: '04003232909' } })
    expect(onValueChange).toHaveBeenLastCalledWith('040.032.329-09')
    expect(getInput()).toHaveAttribute('data-kind', 'cpf-or-cnpj')
  })

  it('cpf-or-cnpj mode dispatches to CNPJ mask for 12+ digits', () => {
    const onValueChange = vi.fn()
    renderWithIntl(
      <ControlledTaxIdInput
        countryCode="BR"
        mode="cpf-or-cnpj"
        onValueChange={onValueChange}
      />,
    )
    fireEvent.change(getInput(), { target: { value: '11222333000181' } })
    expect(onValueChange).toHaveBeenLastCalledWith('11.222.333/0001-81')
  })

  it('defaults to cpf mode when mode prop is omitted', () => {
    renderWithIntl(<ControlledTaxIdInput countryCode="BR" />)
    expect(getInput()).toHaveAttribute('data-kind', 'cpf')
  })
})

describe('TaxIdInput — fallback (non-BR)', () => {
  it('passes input through unchanged with no formatter', () => {
    const onValueChange = vi.fn()
    renderWithIntl(
      <ControlledTaxIdInput
        countryCode="US"
        onValueChange={onValueChange}
      />,
    )
    fireEvent.change(getInput(), { target: { value: '123-45-6789' } })
    expect(onValueChange).toHaveBeenLastCalledWith('123-45-6789')
    // Fallback variant doesn't carry a country/kind data-attr.
    expect(getInput()).not.toHaveAttribute('data-country')
  })

  it('ignores mode prop on non-BR (no CNPJ mask for unsupported countries)', () => {
    const onValueChange = vi.fn()
    renderWithIntl(
      <ControlledTaxIdInput
        countryCode="US"
        mode="cpf-or-cnpj"
        onValueChange={onValueChange}
      />,
    )
    fireEvent.change(getInput(), { target: { value: '11222333000181' } })
    // Pass-through, no masking applied
    expect(onValueChange).toHaveBeenLastCalledWith('11222333000181')
  })
})

// =============================================================================
// TaxIdLabel — text resolution per mode + responsive value
// =============================================================================

describe('TaxIdLabel — BR text resolution', () => {
  it('renders "CPF" for cpf mode regardless of value', () => {
    renderWithIntl(<TaxIdLabel countryCode="BR" mode="cpf" />)
    expect(screen.getByText('CPF')).toBeInTheDocument()
  })

  it('renders "CNPJ" for cnpj mode regardless of value', () => {
    renderWithIntl(<TaxIdLabel countryCode="BR" mode="cnpj" />)
    expect(screen.getByText('CNPJ')).toBeInTheDocument()
  })

  it('renders the combined label for cpf-or-cnpj with empty value', () => {
    renderWithIntl(
      <TaxIdLabel countryCode="BR" mode="cpf-or-cnpj" value="" />,
    )
    expect(screen.getByText('CPF or CNPJ')).toBeInTheDocument()
  })

  it('renders "CPF" for cpf-or-cnpj with ≤11 digits typed', () => {
    renderWithIntl(
      <TaxIdLabel countryCode="BR" mode="cpf-or-cnpj" value="040.032.329-09" />,
    )
    expect(screen.getByText('CPF')).toBeInTheDocument()
    expect(screen.queryByText('CNPJ')).not.toBeInTheDocument()
  })

  it('renders "CNPJ" for cpf-or-cnpj with 12+ digits typed', () => {
    renderWithIntl(
      <TaxIdLabel countryCode="BR" mode="cpf-or-cnpj" value="11.222.333/0001-81" />,
    )
    expect(screen.getByText('CNPJ')).toBeInTheDocument()
    expect(screen.queryByText('CPF or CNPJ')).not.toBeInTheDocument()
  })

  it('responds to value crossing the 11/12 digit threshold on rerender', () => {
    const { rerender } = renderWithIntl(
      <TaxIdLabel countryCode="BR" mode="cpf-or-cnpj" value="04003232909" />,
    )
    expect(screen.getByText('CPF')).toBeInTheDocument()
    rerender(
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <TaxIdLabel countryCode="BR" mode="cpf-or-cnpj" value="040032329091" />
      </NextIntlClientProvider>,
    )
    expect(screen.getByText('CNPJ')).toBeInTheDocument()
  })
})

describe('TaxIdLabel — fallback', () => {
  it('renders the i18n "Tax ID" string for non-BR countries', () => {
    renderWithIntl(<TaxIdLabel countryCode="US" />)
    expect(screen.getByText('Tax ID')).toBeInTheDocument()
  })

  it('ignores mode prop on non-BR (always falls back to taxIdLabel)', () => {
    renderWithIntl(
      <TaxIdLabel countryCode="US" mode="cpf-or-cnpj" value="04003232909" />,
    )
    expect(screen.getByText('Tax ID')).toBeInTheDocument()
    expect(screen.queryByText('CPF')).not.toBeInTheDocument()
  })
})

describe('TaxIdLabel — children pass-through', () => {
  it('renders children alongside the resolved label text', () => {
    renderWithIntl(
      <TaxIdLabel countryCode="BR" mode="cpf">
        <span data-testid="indicator">★</span>
      </TaxIdLabel>,
    )
    expect(screen.getByText('CPF')).toBeInTheDocument()
    expect(screen.getByTestId('indicator')).toBeInTheDocument()
  })
})
