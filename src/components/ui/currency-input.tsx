'use client'

import { useMemo, useState } from 'react'
import { cva } from 'class-variance-authority'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Currency config
// ---------------------------------------------------------------------------

type SupportedCurrency = 'BRL' | 'USD'

const CURRENCY_CONFIG: Record<
  SupportedCurrency,
  {
    decimalAliases: string[]
    decimalSeparator: string
    fractionDigits: number
    groupSeparator: string
    symbol: string
  }
> = {
  BRL: {
    decimalAliases: [',', '.'],
    decimalSeparator: ',',
    fractionDigits: 2,
    groupSeparator: '.',
    symbol: 'R$',
  },
  USD: {
    decimalAliases: ['.', ','],
    decimalSeparator: '.',
    fractionDigits: 2,
    groupSeparator: ',',
    symbol: '$',
  },
}

const SUPPORTED_CURRENCIES: SupportedCurrency[] = ['BRL', 'USD']

// 10-digit cap in minor units: R$99.999.999,99 / $99,999,999.99.
const MAX_MINOR_UNITS = 99_999_999_99

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

function formatMinorUnits(
  minorUnits: number,
  currency: SupportedCurrency,
): string {
  const { decimalSeparator, fractionDigits, groupSeparator } =
    CURRENCY_CONFIG[currency]
  const scale = 10 ** fractionDigits
  const whole = Math.floor(minorUnits / scale)
  const fraction = minorUnits % scale

  const integerStr = whole
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, groupSeparator)
  const decimalStr = fraction.toString().padStart(fractionDigits, '0')

  return `${integerStr}${decimalSeparator}${decimalStr}`
}

function splitFormattedAmount(
  formatted: string,
  currency: SupportedCurrency,
): { decimal: string; integer: string } {
  const separator = CURRENCY_CONFIG[currency].decimalSeparator
  const separatorIndex = formatted.lastIndexOf(separator)
  if (separatorIndex === -1) return { integer: formatted, decimal: '' }

  return {
    integer: formatted.slice(0, separatorIndex),
    decimal: formatted.slice(separatorIndex),
  }
}

function parseCurrencyText(
  raw: string,
  currency: SupportedCurrency,
): number | undefined {
  const config = CURRENCY_CONFIG[currency]
  const trimmed = raw.trim()
  if (!trimmed) return undefined

  const withoutSymbol = trimmed
    .replace(config.symbol, '')
    .replace(/\s/g, '')

  const decimalIndex = Math.max(
    ...config.decimalAliases.map((alias) => withoutSymbol.lastIndexOf(alias)),
  )

  const possibleFractionPart =
    decimalIndex >= 0 ? withoutSymbol.slice(decimalIndex + 1) : ''
  const possibleFractionDigits = possibleFractionPart.replace(/\D/g, '')
  const hasDecimalPart =
    decimalIndex >= 0 && possibleFractionDigits.length <= config.fractionDigits

  const integerPart = hasDecimalPart
    ? withoutSymbol.slice(0, decimalIndex)
    : withoutSymbol
  const fractionPart = hasDecimalPart ? possibleFractionPart : ''

  const wholeDigits = integerPart.replace(/\D/g, '')
  const fractionDigits = fractionPart.replace(/\D/g, '')
  if (!wholeDigits && !fractionDigits) return undefined

  const wholeMinor = Number.parseInt(wholeDigits || '0', 10) *
    (10 ** config.fractionDigits)
  const normalizedFraction = fractionDigits
    .slice(0, config.fractionDigits)
    .padEnd(config.fractionDigits, '0')
  const fractionMinor = Number.parseInt(normalizedFraction || '0', 10)
  const next = wholeMinor + fractionMinor

  if (!Number.isSafeInteger(next) || next > MAX_MINOR_UNITS) return undefined
  return next > 0 ? next : undefined
}

// ---------------------------------------------------------------------------
// Variants
// ---------------------------------------------------------------------------

const currencyInputVariants = cva(
  'group/currency relative flex items-center transition-colors',
  {
    variants: {
      variant: {
        card: [
          'border-input bg-muted rounded-2xl border',
          'focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-3',
          'data-[active=true]:border-ring data-[active=true]:ring-ring/50 data-[active=true]:ring-3',
          'aria-invalid:border-destructive aria-invalid:ring-destructive/20',
        ].join(' '),
        page: [
          'border-input rounded-2xl border bg-transparent',
          'focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-3',
          'data-[active=true]:border-ring data-[active=true]:ring-ring/50 data-[active=true]:ring-3',
          'aria-invalid:border-destructive aria-invalid:ring-destructive/20',
          'dark:bg-input/30',
        ].join(' '),
        underline: [
          'border-b-2 border-border bg-transparent',
          'focus-within:border-primary',
          'data-[active=true]:border-primary',
        ].join(' '),
      },
      size: {
        default: 'h-12 gap-1 px-4',
        lg: 'h-14 gap-2 px-4',
        // Fixed height so items-center vertically centers the content for
        // every variant. (The previous pb-2-only approach skewed alignment
        // for the boxed card / page variants.)
        xl: 'h-20 justify-center gap-2 px-4',
      },
    },
    defaultVariants: { variant: 'card', size: 'default' },
  },
)

const symbolVariants = cva('shrink-0 font-bold transition-colors select-none', {
  variants: {
    size: {
      default: 'text-base',
      lg: 'text-lg',
      xl: 'text-3xl',
    },
  },
  defaultVariants: { size: 'default' },
})

const inputVariants = cva(
  'min-w-0 flex-1 bg-transparent p-0 font-bold tabular-nums text-foreground outline-none placeholder:text-muted-foreground/40 disabled:cursor-not-allowed',
  {
    variants: {
      size: {
        default: 'text-base',
        lg: 'text-xl',
        xl: 'text-4xl',
      },
    },
    defaultVariants: { size: 'default' },
  },
)

const displayIntegerVariants = cva('font-bold tabular-nums text-foreground', {
  variants: {
    size: {
      default: 'text-base',
      lg: 'text-xl',
      xl: 'text-4xl',
    },
  },
  defaultVariants: { size: 'default' },
})

const displayDecimalVariants = cva('font-bold tabular-nums', {
  variants: {
    size: {
      default: 'text-base text-foreground',
      lg: 'text-base text-muted-foreground',
      xl: 'text-2xl text-muted-foreground',
    },
  },
  defaultVariants: { size: 'default' },
})

// ---------------------------------------------------------------------------
// CurrencyInput
// ---------------------------------------------------------------------------

type CurrencyInputSize = 'default' | 'lg' | 'xl'
type CurrencyInputVariant = 'card' | 'page' | 'underline'

interface CurrencyInputProps {
  'aria-describedby'?: string
  'aria-invalid'?: boolean
  'aria-label'?: string
  className?: string
  currency?: SupportedCurrency
  disabled?: boolean
  id?: string
  name?: string
  placeholder?: string
  size?: CurrencyInputSize
  value: number | undefined
  variant?: CurrencyInputVariant
  onCurrencyChange?: (currency: SupportedCurrency) => void
  onValueChange: (minorUnits: number | undefined) => void
}

function CurrencyInput({
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
  'aria-label': ariaLabel,
  className,
  currency = 'BRL',
  disabled = false,
  id,
  name,
  placeholder = '0',
  size = 'default',
  value,
  variant = 'card',
  onCurrencyChange,
  onValueChange,
}: CurrencyInputProps) {
  const config = CURRENCY_CONFIG[currency]
  const [inputState, setInputState] = useState(() => ({
    draft: value !== undefined && value > 0 ? formatMinorUnits(value, currency) : '',
    isFocused: false,
    lastParsedValue: value,
  }))
  const [isCurrencyOpen, setIsCurrencyOpen] = useState(false)

  const controlledDraft =
    value !== undefined && value > 0 ? formatMinorUnits(value, currency) : ''
  const currentDraft = inputState.isFocused ? inputState.draft : controlledDraft

  const placeholderText = useMemo(() => {
    if (placeholder !== '0') return placeholder
    return formatMinorUnits(0, currency)
  }, [currency, placeholder])

  const hasDisplayValue = currentDraft.trim().length > 0
  const showFormattedDisplay =
    hasDisplayValue && !inputState.isFocused && !disabled
  const formattedDisplay = showFormattedDisplay
    ? splitFormattedAmount(currentDraft, currency)
    : null

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (disabled) return

    const nextDraft = e.target.value

    if (!nextDraft.trim()) {
      setInputState({
        draft: nextDraft,
        isFocused: inputState.isFocused,
        lastParsedValue: undefined,
      })
      onValueChange(undefined)
      return
    }

    const parsed = parseCurrencyText(nextDraft, currency)
    if (parsed !== undefined) {
      setInputState({
        draft: nextDraft,
        isFocused: inputState.isFocused,
        lastParsedValue: parsed,
      })
      onValueChange(parsed)
      return
    }

    setInputState({
      draft: nextDraft,
      isFocused: inputState.isFocused,
      lastParsedValue: undefined,
    })
  }

  function handleFocus() {
    setInputState({
      draft: currentDraft,
      isFocused: true,
      lastParsedValue: value,
    })
  }

  function handleBlur() {
    if (
      inputState.lastParsedValue !== undefined &&
      inputState.lastParsedValue > 0
    ) {
      setInputState({
        draft: formatMinorUnits(inputState.lastParsedValue, currency),
        isFocused: false,
        lastParsedValue: inputState.lastParsedValue,
      })
      return
    }
    if (inputState.draft.trim()) onValueChange(undefined)
    setInputState({
      draft: '',
      isFocused: false,
      lastParsedValue: undefined,
    })
  }

  const symbolClassName = cn(
    symbolVariants({ size }),
    hasDisplayValue ? 'text-foreground' : 'text-muted-foreground/40',
    'group-focus-within/currency:text-primary',
    'group-data-[active=true]/currency:text-primary',
  )
  const isActive = inputState.isFocused || isCurrencyOpen

  return (
    <div
      data-slot="currency-input"
      data-active={isActive ? 'true' : undefined}
      className={cn(
        currencyInputVariants({ variant, size }),
        disabled && 'pointer-events-none opacity-50',
        className,
      )}
      aria-invalid={ariaInvalid}
    >
      {onCurrencyChange ? (
        <div
          data-slot="currency-selector"
          className="relative z-10"
          onClick={(e) => e.stopPropagation()}
        >
          <Select
            open={isCurrencyOpen}
            value={currency}
            onOpenChange={setIsCurrencyOpen}
            onValueChange={(val) => onCurrencyChange(val as SupportedCurrency)}
          >
            <SelectTrigger
              aria-label="Select currency"
              className={cn(
                'h-auto w-auto min-w-0 shrink-0 cursor-pointer gap-1 border-0 bg-transparent p-0 rounded-none shadow-none focus-visible:border-0 focus-visible:ring-0',
                // Chevron tracks the symbol's color states so the selector
                // reads as one unit rather than icon + glyph at different
                // brightnesses.
                '[&_svg]:transition-colors',
                hasDisplayValue ? '[&_svg]:text-foreground' : '[&_svg]:text-muted-foreground/40',
                'group-focus-within/currency:[&_svg]:text-primary',
                'group-data-[active=true]/currency:[&_svg]:text-primary',
              )}
            >
              <span className={symbolClassName}>
                {config.symbol}
              </span>
            </SelectTrigger>
            <SelectContent align="start">
              {SUPPORTED_CURRENCIES.map((c) => (
                <SelectItem key={c} value={c}>
                  <span className="w-8 font-bold">{CURRENCY_CONFIG[c].symbol}</span>
                  <span className="text-muted-foreground">{c}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <span className={symbolClassName}>
          {config.symbol}
        </span>
      )}

      <div
        data-slot="currency-amount"
        className="relative flex min-w-0 flex-1 items-baseline"
      >
        {showFormattedDisplay && formattedDisplay ? (
          <div
            data-slot="currency-amount-display"
            className="pointer-events-none flex items-baseline"
          >
            <span
              data-slot="currency-amount-integer"
              className={displayIntegerVariants({ size })}
            >
              {formattedDisplay.integer}
            </span>
            <span
              data-slot="currency-amount-decimal"
              className={displayDecimalVariants({ size })}
            >
              {formattedDisplay.decimal}
            </span>
          </div>
        ) : null}

        <input
          id={id}
          name={name}
          type="text"
          inputMode="decimal"
          value={currentDraft}
          placeholder={placeholderText}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={disabled}
          className={cn(
            inputVariants({ size }),
            showFormattedDisplay && 'absolute inset-0 h-full w-full opacity-0',
          )}
          aria-describedby={ariaDescribedBy}
          aria-label={ariaLabel ?? `Amount in ${currency}`}
        />
      </div>
    </div>
  )
}

export { CurrencyInput, currencyInputVariants, CURRENCY_CONFIG, SUPPORTED_CURRENCIES }
export type { CurrencyInputProps, SupportedCurrency }
