export const SUPPORTED_CURRENCIES = ['BRL', 'USD'] as const

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number]

// 10-digit cap in minor units: R$99.999.999,99 / $99,999,999.99.
export const MAX_MINOR_UNITS = 99_999_999_99

export function coerceCurrency(value: string | null | undefined): SupportedCurrency {
  return SUPPORTED_CURRENCIES.includes(value as SupportedCurrency)
    ? (value as SupportedCurrency)
    : 'BRL'
}
