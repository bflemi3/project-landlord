export function formatCurrency(amountMinor: number, currency: string = 'BRL'): string {
  const amount = amountMinor / 100
  const symbols: Record<string, string> = { BRL: 'R$', USD: '$', EUR: '€' }
  const locales: Record<string, string> = { BRL: 'pt-BR', USD: 'en-US', EUR: 'de-DE' }
  const symbol = symbols[currency] ?? currency
  const locale = locales[currency] ?? 'en-US'
  return `${symbol} ${amount.toLocaleString(locale)}`
}

export function formatAmount(amount: number, currency: string = 'BRL'): string {
  const locales: Record<string, string> = { BRL: 'pt-BR', USD: 'en-US', EUR: 'de-DE' }
  const locale = locales[currency] ?? 'en-US'
  return amount.toLocaleString(locale)
}
