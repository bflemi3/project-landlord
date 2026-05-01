import { describe, it, expect, vi, afterEach } from 'vitest'
import { useState } from 'react'
import { act, render, screen, cleanup, fireEvent, within } from '@testing-library/react'
import { CurrencyInput } from '../currency-input'

afterEach(cleanup)

function getInput(container?: HTMLElement | null) {
  const scope = container ? within(container) : screen
  return scope.getByRole('textbox', { name: /amount in/i })
}

function getWrapper(container?: HTMLElement | null) {
  return getInput(container).closest('[data-slot="currency-input"]') as HTMLElement
}

function getAmountDisplay() {
  return document.querySelector('[data-slot="currency-amount-display"]') as HTMLElement | null
}

function getAmountInteger() {
  return document.querySelector('[data-slot="currency-amount-integer"]') as HTMLElement | null
}

function getAmountDecimal() {
  return document.querySelector('[data-slot="currency-amount-decimal"]') as HTMLElement | null
}

function changeInput(value: string) {
  return fireEvent.change(getInput(), { target: { value } })
}

function ControlledCurrencyInput({
  initialValue,
}: {
  initialValue?: number
}) {
  const [value, setValue] = useState<number | undefined>(initialValue)

  return (
    <CurrencyInput
      value={value}
      onValueChange={setValue}
    />
  )
}

// ---------------------------------------------------------------------------
// Formatting display
// ---------------------------------------------------------------------------

describe('CurrencyInput formatting', () => {
  it('shows placeholder when value is undefined', () => {
    render(<CurrencyInput value={undefined} onValueChange={vi.fn()} />)
    expect(getInput().getAttribute('placeholder')).toBe('0,00')
  })

  it('shows custom placeholder', () => {
    render(
      <CurrencyInput value={undefined} placeholder="—" onValueChange={vi.fn()} />,
    )
    expect(getInput().getAttribute('placeholder')).toBe('—')
  })

  it('formats BRL: 15099 → 150,99', () => {
    render(<CurrencyInput value={15099} onValueChange={vi.fn()} />)
    expect((getInput() as HTMLInputElement).value).toBe('150,99')
  })

  it('formats BRL with group separator: 1234567 → 12.345,67', () => {
    render(<CurrencyInput value={1234567} onValueChange={vi.fn()} />)
    expect((getInput() as HTMLInputElement).value).toBe('12.345,67')
  })

  it('formats USD: 15099 → 150.99', () => {
    render(
      <CurrencyInput value={15099} currency="USD" onValueChange={vi.fn()} />,
    )
    expect((getInput() as HTMLInputElement).value).toBe('150.99')
  })

  it('formats USD with group separator: 1234567 → 12,345.67', () => {
    render(
      <CurrencyInput value={1234567} currency="USD" onValueChange={vi.fn()} />,
    )
    expect((getInput() as HTMLInputElement).value).toBe('12,345.67')
  })

  it('formats single cent: 1 → 0,01 (BRL)', () => {
    render(<CurrencyInput value={1} onValueChange={vi.fn()} />)
    expect((getInput() as HTMLInputElement).value).toBe('0,01')
  })

  it('formats 100 → 1,00 (BRL)', () => {
    render(<CurrencyInput value={100} onValueChange={vi.fn()} />)
    expect((getInput() as HTMLInputElement).value).toBe('1,00')
  })

  it('treats value=0 as empty: textbox uses placeholder', () => {
    render(<CurrencyInput value={0} onValueChange={vi.fn()} />)
    const input = getInput() as HTMLInputElement
    expect(input.value).toBe('')
    expect(input.getAttribute('placeholder')).toBe('0,00')
  })

  it('applies placeholder styling for empty values', () => {
    render(<CurrencyInput value={0} onValueChange={vi.fn()} />)
    expect(getInput().className).toContain('placeholder:text-muted-foreground/40')
  })

  it('keeps placeholder styling at lg size', () => {
    render(<CurrencyInput value={0} size="lg" onValueChange={vi.fn()} />)
    expect(getInput().className).toContain('placeholder:text-muted-foreground/40')
  })

  it('keeps placeholder styling at xl size', () => {
    render(<CurrencyInput value={0} size="xl" onValueChange={vi.fn()} />)
    expect(getInput().className).toContain('placeholder:text-muted-foreground/40')
  })

  it('applies foreground styling to the amount input', () => {
    render(<CurrencyInput value={15099} onValueChange={vi.fn()} />)
    expect(getInput().className).toContain('text-foreground')
  })

  it('at default size, amount input uses base text size', () => {
    render(<CurrencyInput value={15099} onValueChange={vi.fn()} />)
    expect(getInput().className).toContain('text-base')
  })

  it('at lg size, amount input uses xl text size', () => {
    render(<CurrencyInput value={15099} size="lg" onValueChange={vi.fn()} />)
    expect(getInput().className).toContain('text-xl')
  })

  it('at xl size, amount input uses 4xl text size', () => {
    render(<CurrencyInput value={15099} size="xl" onValueChange={vi.fn()} />)
    expect(getInput().className).toContain('text-4xl')
  })

  it('at default size, blurred display keeps integer and cents visually matched', () => {
    render(<CurrencyInput value={15099} onValueChange={vi.fn()} />)

    const integer = getAmountInteger()!
    const decimal = getAmountDecimal()!
    expect(integer.textContent).toBe('150')
    expect(decimal.textContent).toBe(',99')
    // Exact-token (classList) checks rather than substring `toContain` —
    // `text-foreground` is a substring of `text-foreground/40`, so a
    // future opacity drift would silently pass a substring assertion.
    expect(integer.classList.contains('text-base')).toBe(true)
    expect(decimal.classList.contains('text-base')).toBe(true)
    expect(decimal.classList.contains('text-foreground')).toBe(true)
    expect(decimal.classList.contains('text-muted-foreground')).toBe(false)
  })

  it('at lg size, blurred display renders cents smaller and muted', () => {
    render(<CurrencyInput value={15099} size="lg" onValueChange={vi.fn()} />)

    const integer = getAmountInteger()!
    const decimal = getAmountDecimal()!
    expect(integer.textContent).toBe('150')
    expect(decimal.textContent).toBe(',99')
    expect(integer.classList.contains('text-xl')).toBe(true)
    expect(integer.classList.contains('text-foreground')).toBe(true)
    expect(decimal.classList.contains('text-base')).toBe(true)
    expect(decimal.classList.contains('text-muted-foreground')).toBe(true)
    expect(decimal.classList.contains('text-foreground')).toBe(false)
  })

  it('at xl size, blurred display renders cents smaller and muted', () => {
    render(<CurrencyInput value={15099} size="xl" onValueChange={vi.fn()} />)

    const integer = getAmountInteger()!
    const decimal = getAmountDecimal()!
    expect(integer.textContent).toBe('150')
    expect(decimal.textContent).toBe(',99')
    expect(integer.classList.contains('text-4xl')).toBe(true)
    expect(integer.classList.contains('text-foreground')).toBe(true)
    expect(decimal.classList.contains('text-2xl')).toBe(true)
    expect(decimal.classList.contains('text-muted-foreground')).toBe(true)
    expect(decimal.classList.contains('text-foreground')).toBe(false)
  })

  it('reformats display when currency switches mid-flow', () => {
    const { rerender } = render(
      <CurrencyInput value={15099} onValueChange={vi.fn()} />,
    )
    expect((getInput() as HTMLInputElement).value).toBe('150,99')

    rerender(
      <CurrencyInput value={15099} currency="USD" onValueChange={vi.fn()} />,
    )
    expect((getInput() as HTMLInputElement).value).toBe('150.99')
  })
})

// ---------------------------------------------------------------------------
// Currency symbol
// ---------------------------------------------------------------------------

describe('CurrencyInput currency symbol', () => {
  it('shows R$ for BRL (default)', () => {
    render(<CurrencyInput value={undefined} onValueChange={vi.fn()} />)
    expect(screen.getByText('R$')).toBeDefined()
  })

  it('shows $ for USD', () => {
    render(
      <CurrencyInput value={undefined} currency="USD" onValueChange={vi.fn()} />,
    )
    expect(screen.getByText('$')).toBeDefined()
  })

  it('uses USD decimal placeholder when currency is USD', () => {
    render(
      <CurrencyInput value={undefined} currency="USD" onValueChange={vi.fn()} />,
    )
    expect(getInput().getAttribute('placeholder')).toBe('0.00')
  })
})

// ---------------------------------------------------------------------------
// Native text input behavior
// ---------------------------------------------------------------------------

describe('CurrencyInput native editing', () => {
  it('renders a visible editable textbox', () => {
    render(<CurrencyInput value={undefined} onValueChange={vi.fn()} />)
    const input = getInput()
    expect(input.className).not.toContain('opacity-0')
    expect(input).toHaveProperty('readOnly', false)
  })

  it('does not prevent default browser text editing keys', () => {
    render(<CurrencyInput value={123400} onValueChange={vi.fn()} />)
    expect(fireEvent.keyDown(getInput(), { key: 'Delete' })).toBe(true)
    expect(fireEvent.keyDown(getInput(), { key: 'Backspace' })).toBe(true)
    expect(fireEvent.keyDown(getInput(), { key: 'ArrowLeft' })).toBe(true)
  })

  it('allows normal text selection', () => {
    render(<CurrencyInput value={123400} onValueChange={vi.fn()} />)
    const input = getInput() as HTMLInputElement
    input.focus()
    input.setSelectionRange(0, input.value.length)
    expect(input.selectionStart).toBe(0)
    expect(input.selectionEnd).toBe(input.value.length)
  })

  it('parses integer input as whole currency units, not cents accumulator', () => {
    const onChange = vi.fn()
    render(<CurrencyInput value={undefined} onValueChange={onChange} />)

    changeInput('1234')
    expect(onChange).toHaveBeenLastCalledWith(123400)
  })

  it('parses a BRL grouped integer as whole currency units', () => {
    const onChange = vi.fn()
    render(<CurrencyInput value={undefined} onValueChange={onChange} />)

    changeInput('1.234')
    expect(onChange).toHaveBeenLastCalledWith(123400)
  })

  it('parses a USD grouped integer as whole currency units', () => {
    const onChange = vi.fn()
    render(<CurrencyInput value={undefined} currency="USD" onValueChange={onChange} />)

    changeInput('1,234')
    expect(onChange).toHaveBeenLastCalledWith(123400)
  })

  // Decimal vs. group-separator ambiguity for BRL when the user types `,`:
  // the parser interprets `,` as decimal only when fraction-digit count
  // ≤ fractionDigits (2). At/below the boundary it's a decimal; over it,
  // the same `,` is treated as a thousands separator.
  it('parses BRL "1,2" (1 fraction digit) as 1.20 reais (120 minor)', () => {
    const onChange = vi.fn()
    render(<CurrencyInput value={undefined} onValueChange={onChange} />)

    changeInput('1,2')
    expect(onChange).toHaveBeenLastCalledWith(120)
  })

  it('parses BRL "1,23" (2 fraction digits, at the boundary) as 1.23 reais', () => {
    const onChange = vi.fn()
    render(<CurrencyInput value={undefined} onValueChange={onChange} />)

    changeInput('1,23')
    expect(onChange).toHaveBeenLastCalledWith(123)
  })

  it('parses BRL "1,234" (3 fraction digits) as whole units 1234 reais', () => {
    // Over the 2-digit boundary `,` falls back to a group separator; the
    // string parses as the whole-unit value 1234 → 123400 minor.
    const onChange = vi.fn()
    render(<CurrencyInput value={undefined} onValueChange={onChange} />)

    changeInput('1,234')
    expect(onChange).toHaveBeenLastCalledWith(123400)
  })

  it('parses BRL "1,2345" (4 fraction digits) as whole units 12345 reais', () => {
    const onChange = vi.fn()
    render(<CurrencyInput value={undefined} onValueChange={onChange} />)

    changeInput('1,2345')
    expect(onChange).toHaveBeenLastCalledWith(1234500)
  })

  it('parses decimal input to minor units', () => {
    const onChange = vi.fn()
    render(<CurrencyInput value={undefined} onValueChange={onChange} />)

    changeInput('1234.50')
    expect(onChange).toHaveBeenLastCalledWith(123450)
  })

  it('accepts BRL-style decimal separators', () => {
    const onChange = vi.fn()
    render(<CurrencyInput value={undefined} onValueChange={onChange} />)

    changeInput('1.234,56')
    expect(onChange).toHaveBeenLastCalledWith(123456)
  })

  it('accepts USD-style decimal separators', () => {
    const onChange = vi.fn()
    render(<CurrencyInput value={undefined} currency="USD" onValueChange={onChange} />)

    changeInput('1,234.56')
    expect(onChange).toHaveBeenLastCalledWith(123456)
  })

  it('uses the rightmost decimal alias when both separators are present', () => {
    const onChange = vi.fn()
    render(<CurrencyInput value={undefined} onValueChange={onChange} />)

    changeInput('1,234.56')
    expect(onChange).toHaveBeenLastCalledWith(123456)
  })

  it('clears value when the user clears the textbox', () => {
    const onChange = vi.fn()
    render(<CurrencyInput value={123400} onValueChange={onChange} />)

    changeInput('')
    expect(onChange).toHaveBeenLastCalledWith(undefined)
  })

  it('keeps invalid focused text as typed without emitting a value', () => {
    const onChange = vi.fn()
    render(<CurrencyInput value={undefined} onValueChange={onChange} />)

    fireEvent.focus(getInput())
    changeInput('abc')
    expect((getInput() as HTMLInputElement).value).toBe('abc')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('clears invalid focused text on blur', () => {
    render(<ControlledCurrencyInput initialValue={123400} />)

    fireEvent.focus(getInput())
    changeInput('abc')
    fireEvent.blur(getInput())
    expect((getInput() as HTMLInputElement).value).toBe('')
  })

  it('calls onBlur when the amount input blurs', () => {
    const onBlur = vi.fn()
    render(
      <CurrencyInput
        value={undefined}
        onBlur={onBlur}
        onValueChange={vi.fn()}
      />,
    )

    fireEvent.focus(getInput())
    fireEvent.blur(getInput())
    expect(onBlur).toHaveBeenCalledOnce()
  })

  it('requests clearing the controlled value when invalid focused text blurs', () => {
    const onChange = vi.fn()
    render(<CurrencyInput value={123400} onValueChange={onChange} />)

    fireEvent.focus(getInput())
    changeInput('abc')
    fireEvent.blur(getInput())
    expect(onChange).toHaveBeenLastCalledWith(undefined)
  })

  it('rejects parsed values above the cap', () => {
    const onChange = vi.fn()
    render(<CurrencyInput value={undefined} onValueChange={onChange} />)

    changeInput('100000000')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('accepts parsed values exactly at the cap', () => {
    const onChange = vi.fn()
    render(<CurrencyInput value={undefined} onValueChange={onChange} />)

    changeInput('99999999.99')
    expect(onChange).toHaveBeenCalledWith(9_999_999_999)
  })

  it('formats the visible text on blur', () => {
    render(<ControlledCurrencyInput />)

    fireEvent.focus(getInput())
    changeInput('1234.5')
    fireEvent.blur(getInput())
    expect((getInput() as HTMLInputElement).value).toBe('1.234,50')
  })

  it('does not force grouping while focused', () => {
    render(<CurrencyInput value={undefined} onValueChange={vi.fn()} />)

    fireEvent.focus(getInput())
    changeInput('1234.5')
    expect((getInput() as HTMLInputElement).value).toBe('1234.5')
  })

  it('preserves focused draft while controlled parent value updates', () => {
    render(<ControlledCurrencyInput />)
    const input = getInput() as HTMLInputElement

    fireEvent.focus(input)
    changeInput('6')
    expect(input.value).toBe('6')

    changeInput('63')
    expect(input.value).toBe('63')

    changeInput('630')
    expect(input.value).toBe('630')
  })

  it('formats focused controlled draft only after blur', () => {
    render(<ControlledCurrencyInput />)
    const input = getInput() as HTMLInputElement

    fireEvent.focus(input)
    changeInput('630')
    expect(input.value).toBe('630')

    fireEvent.blur(input)
    expect(input.value).toBe('630,00')
  })

  it('hides blurred amount display while focused', () => {
    render(<CurrencyInput value={63000} size="lg" onValueChange={vi.fn()} />)
    const input = getInput() as HTMLInputElement

    expect(getAmountDisplay()).toBeDefined()
    fireEvent.focus(input)

    expect(getAmountDisplay()).toBeNull()
    expect(input.className).not.toContain('opacity-0')
  })

  it('does not re-emit onValueChange on focus→blur when starting at value=0', () => {
    // value=0 is treated as empty by the component (placeholder shown).
    // A bare focus/blur cycle with no typing should NOT trigger an
    // onValueChange(undefined) call — that would mark consumer forms dirty
    // for free and cause spurious re-validation.
    const onChange = vi.fn()
    render(<CurrencyInput value={0} onValueChange={onChange} />)

    fireEvent.focus(getInput())
    fireEvent.blur(getInput())

    expect(onChange).not.toHaveBeenCalled()
    expect((getInput() as HTMLInputElement).value).toBe('')
  })

  it('syncs external controlled value when not focused', () => {
    const { rerender } = render(
      <CurrencyInput value={undefined} onValueChange={vi.fn()} />,
    )
    expect((getInput() as HTMLInputElement).value).toBe('')

    rerender(<CurrencyInput value={63000} onValueChange={vi.fn()} />)
    expect((getInput() as HTMLInputElement).value).toBe('630,00')
  })
})

// ---------------------------------------------------------------------------
// Disabled state
// ---------------------------------------------------------------------------

describe('CurrencyInput disabled', () => {
  it('applies disabled styling', () => {
    render(<CurrencyInput value={undefined} disabled onValueChange={vi.fn()} />)
    const wrapper = getWrapper()
    expect(wrapper.className).toContain('pointer-events-none')
    expect(wrapper.className).toContain('opacity-50')
  })

  it('disables the amount input', () => {
    render(<CurrencyInput value={undefined} disabled onValueChange={vi.fn()} />)
    expect(getInput()).toHaveProperty('disabled', true)
  })

  it('ignores keyboard input when disabled', () => {
    const onChange = vi.fn()
    render(<CurrencyInput value={100} disabled onValueChange={onChange} />)

    changeInput('200')
    expect(onChange).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// Variants
// ---------------------------------------------------------------------------

describe('CurrencyInput variants', () => {
  it('defaults to card variant', () => {
    render(<CurrencyInput value={undefined} onValueChange={vi.fn()} />)
    expect(getWrapper().className).toContain('bg-muted')
  })

  it('applies page variant', () => {
    render(
      <CurrencyInput value={undefined} variant="page" onValueChange={vi.fn()} />,
    )
    expect(getWrapper().className).toContain('bg-transparent')
  })

  it('applies underline variant', () => {
    render(
      <CurrencyInput
        value={undefined}
        variant="underline"
        onValueChange={vi.fn()}
      />,
    )
    const cls = getWrapper().className
    expect(cls).toContain('border-b-2')
    expect(cls).toContain('bg-transparent')
  })
})

// ---------------------------------------------------------------------------
// Size variants
// ---------------------------------------------------------------------------

describe('CurrencyInput sizes', () => {
  it('defaults to size=default (h-12)', () => {
    render(<CurrencyInput value={undefined} onValueChange={vi.fn()} />)
    expect(getWrapper().className).toContain('h-12')
  })

  it('applies lg size (h-14)', () => {
    render(
      <CurrencyInput value={undefined} size="lg" onValueChange={vi.fn()} />,
    )
    expect(getWrapper().className).toContain('h-14')
  })

  it('applies xl size (h-20 with horizontal centering)', () => {
    render(
      <CurrencyInput value={undefined} size="xl" onValueChange={vi.fn()} />,
    )
    expect(getWrapper().className).toContain('h-20')
    expect(getWrapper().className).toContain('justify-center')
  })

  it('xl size does not rely on pb-only padding (would skew vertical centering)', () => {
    // Regression: the prior xl variant used only `pb-2` for spacing, which
    // pushed content above the visual center for the boxed variants. Verify
    // we no longer carry that asymmetric padding.
    render(
      <CurrencyInput
        value={undefined}
        size="xl"
        variant="page"
        onValueChange={vi.fn()}
      />,
    )
    const cls = getWrapper().className
    expect(cls).not.toMatch(/(?:^|\s)pb-2(?:\s|$)/)
  })

  it('xl + page variant has both fixed height and items-center for vertical centering', () => {
    render(
      <CurrencyInput
        value={undefined}
        size="xl"
        variant="page"
        onValueChange={vi.fn()}
      />,
    )
    const cls = getWrapper().className
    expect(cls).toContain('h-20')
    // items-center comes from the cva base; it pairs with the fixed height
    // to vertically center content regardless of variant.
    expect(cls).toContain('items-center')
  })
})

// ---------------------------------------------------------------------------
// ARIA
// ---------------------------------------------------------------------------

describe('CurrencyInput ARIA', () => {
  it('has an accessible label with currency name', () => {
    render(<CurrencyInput value={undefined} onValueChange={vi.fn()} />)
    expect(getInput().getAttribute('aria-label')).toBe('Amount in BRL')
  })

  it('forwards id, name, and describedby to the hidden textbox', () => {
    render(
      <CurrencyInput
        id="rent-amount"
        name="rent_amount"
        aria-describedby="rent-amount-hint"
        value={undefined}
        onValueChange={vi.fn()}
      />,
    )

    const input = screen.getByRole('textbox', { name: /amount in brl/i })
    expect(input.getAttribute('id')).toBe('rent-amount')
    expect(input.getAttribute('name')).toBe('rent_amount')
    expect(input.getAttribute('aria-describedby')).toBe('rent-amount-hint')
  })

  it('updates label when currency changes', () => {
    render(
      <CurrencyInput value={undefined} currency="USD" onValueChange={vi.fn()} />,
    )
    expect(getInput().getAttribute('aria-label')).toBe('Amount in USD')
  })

  it('forwards aria-invalid=true to wrapper', () => {
    render(
      <CurrencyInput value={undefined} aria-invalid onValueChange={vi.fn()} />,
    )
    expect(getWrapper().getAttribute('aria-invalid')).toBe('true')
  })

  it('forwards aria-invalid=false to wrapper', () => {
    render(
      <CurrencyInput
        value={undefined}
        aria-invalid={false}
        onValueChange={vi.fn()}
      />,
    )
    expect(getWrapper().getAttribute('aria-invalid')).toBe('false')
  })

  it('does not set aria-invalid when prop is omitted', () => {
    render(<CurrencyInput value={undefined} onValueChange={vi.fn()} />)
    expect(getWrapper().hasAttribute('aria-invalid')).toBe(false)
  })

  it('SelectTrigger has aria-label="Select currency"', () => {
    render(
      <CurrencyInput
        value={undefined}
        onCurrencyChange={vi.fn()}
        onValueChange={vi.fn()}
      />,
    )
    expect(screen.getByRole('combobox').getAttribute('aria-label')).toBe(
      'Select currency',
    )
  })

  it('amount input has inputMode=decimal', () => {
    render(<CurrencyInput value={undefined} onValueChange={vi.fn()} />)
    expect(getInput().getAttribute('inputmode')).toBe('decimal')
  })
})

// ---------------------------------------------------------------------------
// className forwarding
// ---------------------------------------------------------------------------

describe('CurrencyInput className', () => {
  it('merges custom className onto wrapper', () => {
    render(
      <CurrencyInput
        value={undefined}
        className="my-custom-class"
        onValueChange={vi.fn()}
      />,
    )
    expect(getWrapper().className).toContain('my-custom-class')
  })
})

// ---------------------------------------------------------------------------
// data-slot
// ---------------------------------------------------------------------------

describe('CurrencyInput data-slot', () => {
  it('has data-slot="currency-input" on wrapper', () => {
    render(<CurrencyInput value={undefined} onValueChange={vi.fn()} />)
    expect(getWrapper().getAttribute('data-slot')).toBe('currency-input')
  })
})

// ---------------------------------------------------------------------------
// Click to focus
// ---------------------------------------------------------------------------

describe('CurrencyInput click to focus', () => {
  it('amount input can receive focus', () => {
    render(<CurrencyInput value={undefined} onValueChange={vi.fn()} />)
    const input = getInput()
    input.focus()
    expect(document.activeElement).toBe(input)
  })

  it('clicking the wrapper does not focus when disabled', () => {
    render(<CurrencyInput value={undefined} disabled onValueChange={vi.fn()} />)
    fireEvent.click(getWrapper())
    expect(document.activeElement).not.toBe(getInput())
  })
})

// ---------------------------------------------------------------------------
// Currency selector
// ---------------------------------------------------------------------------

describe('CurrencyInput currency selector', () => {
  it('does not render Select trigger when onCurrencyChange is omitted', () => {
    render(<CurrencyInput value={undefined} onValueChange={vi.fn()} />)
    expect(screen.queryByRole('combobox')).toBeNull()
  })

  it('renders Select trigger when onCurrencyChange is provided', () => {
    render(
      <CurrencyInput
        value={undefined}
        onCurrencyChange={vi.fn()}
        onValueChange={vi.fn()}
      />,
    )
    expect(screen.getByRole('combobox')).toBeDefined()
  })

  it('keeps the currency trigger above the hidden amount textbox', () => {
    render(
      <CurrencyInput
        value={undefined}
        onCurrencyChange={vi.fn()}
        onValueChange={vi.fn()}
      />,
    )

    const selector = screen
      .getByRole('combobox')
      .closest('[data-slot="currency-selector"]')

    expect(selector).toBeDefined()
    expect(selector?.className).toContain('relative')
    expect(selector?.className).toContain('z-10')
    expect(screen.getByRole('combobox').className).toContain('cursor-pointer')
  })

  it('keeps the outer input active while the currency menu is open', () => {
    render(
      <CurrencyInput
        value={undefined}
        onCurrencyChange={vi.fn()}
        onValueChange={vi.fn()}
      />,
    )

    const wrapper = getWrapper()
    expect(wrapper.getAttribute('data-active')).toBeNull()

    fireEvent.click(screen.getByRole('combobox'))
    expect(wrapper.getAttribute('data-active')).toBe('true')
  })

  it('fires onCurrencyChange when the user picks a different currency', () => {
    const onCurrencyChange = vi.fn()
    render(
      <CurrencyInput
        value={undefined}
        onCurrencyChange={onCurrencyChange}
        onValueChange={vi.fn()}
      />,
    )

    // Open the menu, focus the USD option, press Enter. base-ui Select
    // doesn't fire onValueChange on a synthetic click in jsdom — its item
    // selection runs through internal pointer/keyboard tracking — so we
    // drive selection via the keyboard path the listbox supports.
    fireEvent.click(screen.getByRole('combobox'))
    const usdOption = screen
      .getAllByRole('option')
      .find((o) => o.textContent?.includes('USD'))!
    act(() => {
      ;(usdOption as HTMLElement).focus()
    })
    fireEvent.keyDown(usdOption, { key: 'Enter' })

    expect(onCurrencyChange).toHaveBeenCalledWith('USD')
  })
})

// ---------------------------------------------------------------------------
// Chevron coloring — tracks the symbol's states so the selector reads as a unit
// ---------------------------------------------------------------------------

describe('CurrencyInput chevron coloring', () => {
  it('mutes the chevron at /40 when value is empty', () => {
    render(
      <CurrencyInput
        value={undefined}
        onCurrencyChange={vi.fn()}
        onValueChange={vi.fn()}
      />,
    )
    const trigger = screen.getByRole('combobox')
    expect(trigger.className).toContain('[&_svg]:text-muted-foreground/40')
    expect(trigger.className).not.toContain('[&_svg]:text-foreground')
  })

  it('also mutes the chevron when value is exactly 0 (treated as empty)', () => {
    render(
      <CurrencyInput
        value={0}
        onCurrencyChange={vi.fn()}
        onValueChange={vi.fn()}
      />,
    )
    const trigger = screen.getByRole('combobox')
    expect(trigger.className).toContain('[&_svg]:text-muted-foreground/40')
  })

  it('brightens the chevron to foreground when value is present', () => {
    render(
      <CurrencyInput
        value={15099}
        onCurrencyChange={vi.fn()}
        onValueChange={vi.fn()}
      />,
    )
    const trigger = screen.getByRole('combobox')
    expect(trigger.className).toContain('[&_svg]:text-foreground')
    expect(trigger.className).not.toContain('[&_svg]:text-muted-foreground/40')
  })

  it('applies the focus-within rule that lights the chevron primary', () => {
    // Focus-within behavior is purely CSS — jsdom does not compute pseudo-class
    // selectors, so we verify the rule is present on the trigger rather than
    // the rendered color. The CSS itself is exercised in the browser.
    render(
      <CurrencyInput
        value={undefined}
        onCurrencyChange={vi.fn()}
        onValueChange={vi.fn()}
      />,
    )
    const trigger = screen.getByRole('combobox')
    expect(trigger.className).toContain(
      'group-focus-within/currency:[&_svg]:text-primary',
    )
  })

  it('chevron color matches the symbol color for the same state', () => {
    // Pair the assertions: when the symbol is muted/40, the chevron is too;
    // when the symbol is foreground, the chevron is too.
    const { rerender } = render(
      <CurrencyInput
        value={undefined}
        onCurrencyChange={vi.fn()}
        onValueChange={vi.fn()}
      />,
    )
    const symbol = screen.getByText('R$')
    let trigger = screen.getByRole('combobox')
    expect(symbol.className).toContain('text-muted-foreground/40')
    expect(trigger.className).toContain('[&_svg]:text-muted-foreground/40')

    rerender(
      <CurrencyInput
        value={15099}
        onCurrencyChange={vi.fn()}
        onValueChange={vi.fn()}
      />,
    )
    trigger = screen.getByRole('combobox')
    expect(screen.getByText('R$').className).toContain('text-foreground')
    expect(trigger.className).toContain('[&_svg]:text-foreground')
  })
})
