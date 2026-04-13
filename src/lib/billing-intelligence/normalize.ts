export function normalizeDate(date: string): string {
  if (date.includes('T')) return date.split('T')[0]
  const brMatch = date.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (brMatch) return `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`
  return date
}

/**
 * Month abbreviation → number mapping.
 * Supports Portuguese (PT-BR), English (EN), and Spanish (ES).
 * Duplicate abbreviations (JAN, MAR, JUL, etc.) are shared across languages.
 */
const MONTH_ABBREVS: Record<string, string> = {
  // Portuguese
  JAN: '01', FEV: '02', MAR: '03', ABR: '04',
  MAI: '05', JUN: '06', JUL: '07', AGO: '08',
  SET: '09', OUT: '10', NOV: '11', DEZ: '12',
  // English (unique ones not already covered by PT)
  FEB: '02', APR: '04', MAY: '05', AUG: '08',
  SEP: '09', OCT: '10', DEC: '12',
  // Spanish (unique ones not already covered by PT or EN)
  ENE: '01', DIC: '12',
}

export function normalizeMonth(month: string): string {
  const match = month.match(/^([A-Z]{3})\/(\d{4})$/)
  if (match) {
    const monthNum = MONTH_ABBREVS[match[1]]
    if (monthNum) return `${match[2]}-${monthNum}`
  }
  return month
}

export function normalizeBarcode(barcode: string): string {
  return barcode.replace(/[\s.\-]/g, '')
}

export function parseBRL(value: string): number {
  return parseFloat(value.replace(/\./g, '').replace(',', '.'))
}

export function toMinorUnits(amount: number): number {
  return Math.round(amount * 100)
}
