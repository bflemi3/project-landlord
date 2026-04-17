import type { BillExtractionResult, ValidationResult } from '../../types'
import { normalizeBarcode, normalizeDate, toMinorUnits } from '../../normalize'
import { fetchEnlivDebitos } from './api-client'

export async function validateEnlivExtraction(
  extraction: BillExtractionResult,
): Promise<ValidationResult | null> {
  try {
    const apiData = await fetchEnlivDebitos(extraction.customer.taxId)
    const discrepancies: ValidationResult['discrepancies'] = []

    const extractedBarcode = normalizeBarcode(extraction.payment.linhaDigitavel ?? '')
    const matchingDebito = apiData.debitos.find(
      (d) => normalizeBarcode(d.linha_digitavel) === extractedBarcode,
    )

    if (!matchingDebito) {
      return {
        valid: false,
        source: 'api',
        discrepancies: [{ field: 'barcode', extracted: extractedBarcode, expected: 'no matching debito found' }],
      }
    }

    const apiAmountMinor = toMinorUnits(matchingDebito.valor)
    if (apiAmountMinor !== extraction.billing.amountDue) {
      discrepancies.push({ field: 'amountDue', extracted: extraction.billing.amountDue, expected: apiAmountMinor })
    }

    const apiDate = normalizeDate(matchingDebito.vencimento)
    if (apiDate !== extraction.billing.dueDate) {
      discrepancies.push({ field: 'dueDate', extracted: extraction.billing.dueDate, expected: apiDate })
    }

    return { valid: discrepancies.length === 0, source: 'api', discrepancies }
  } catch {
    return null
  }
}
