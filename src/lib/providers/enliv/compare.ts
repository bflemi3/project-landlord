import type { EnlivDebito, EnlivResumoDebitos, EnlivBillExtraction } from './types'

export interface EnlivComparisonField {
  field: string
  api: string
  pdf: string
  match: boolean
}

export interface EnlivDebitoComparison {
  debitoIndex: number
  installationNumber: string
  barcodeMatch: boolean
  fields: EnlivComparisonField[]
}

/**
 * Normalize a linha digitável (barcode) to digits only for comparison.
 * Enliv API and PDF format barcodes differently (spacing, dots, dashes).
 */
function normalizeBarcode(barcode: string): string {
  return barcode.replace(/[\s.\-]/g, '')
}

/**
 * Normalize a date to YYYY-MM-DD for comparison.
 * Handles ISO 8601 (2026-04-24T19:33:21.923Z) and BR format (24/04/2026).
 */
function normalizeDate(date: string): string {
  // ISO format: take the date part before T
  if (date.includes('T')) {
    return date.split('T')[0]
  }
  // BR format DD/MM/YYYY → YYYY-MM-DD
  const brMatch = date.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (brMatch) {
    return `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`
  }
  // Already YYYY-MM-DD or unknown
  return date
}

function compareDebito(
  apiData: EnlivResumoDebitos,
  apiDebito: EnlivDebito,
  debitoIndex: number,
  pdfData: EnlivBillExtraction,
): EnlivDebitoComparison {
  const apiBarcode = normalizeBarcode(apiDebito.linha_digitavel)
  const pdfBarcode = normalizeBarcode(pdfData.linhaDigitavel)

  return {
    debitoIndex,
    installationNumber: apiDebito.cadastroDistribuidora,
    barcodeMatch: apiBarcode === pdfBarcode,
    fields: [
      {
        field: 'Barcode',
        api: apiDebito.linha_digitavel,
        pdf: pdfData.linhaDigitavel,
        match: apiBarcode === pdfBarcode,
      },
      {
        field: 'Installation / UC',
        api: apiDebito.cadastroDistribuidora,
        pdf: pdfData.installationNumber,
        match: apiDebito.cadastroDistribuidora === pdfData.installationNumber,
      },
      {
        field: 'Customer Name',
        api: apiData.nome_cliente,
        pdf: pdfData.customerName,
        match: apiData.nome_cliente === pdfData.customerName,
      },
      {
        field: 'Amount',
        api: apiDebito.valor.toFixed(2),
        pdf: pdfData.amountDue.toFixed(2),
        match: apiDebito.valor === pdfData.amountDue,
      },
      {
        field: 'Due Date',
        api: apiDebito.vencimento,
        pdf: pdfData.dueDate,
        match: normalizeDate(apiDebito.vencimento) === normalizeDate(pdfData.dueDate),
      },
    ],
  }
}

/**
 * Compare all API debitos against a PDF extraction.
 * Each debito gets its own comparison result with a barcodeMatch flag
 * indicating whether it corresponds to the uploaded PDF.
 */
export function compareEnlivApiVsPdf(
  apiData: EnlivResumoDebitos,
  pdfData: EnlivBillExtraction,
): EnlivDebitoComparison[] {
  return apiData.debitos.map((debito, i) =>
    compareDebito(apiData, debito, i, pdfData),
  )
}
