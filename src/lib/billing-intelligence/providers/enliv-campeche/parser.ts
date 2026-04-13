import type { ExtractionResult } from '../../types'
import { normalizeDate, normalizeMonth, parseBRL, toMinorUnits, normalizeBarcode } from '../../normalize'
import { buildExtractionConfidence } from '../../confidence'

// Placeholder — will be replaced with the real provider_invoice_profiles.id
// when Enliv Campeche is created through the engineering playground
const PROFILE_ID = 'a1b2c3d4-0002-0002-0002-000000000001'

export function parseEnlivBillText(text: string): ExtractionResult | null {
  const providerTaxId = extractField(text, /CNPJ:\s*(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/)
  if (!providerTaxId) return null

  const customerName = extractField(text, /Cliente:\s*\n(.+)/) ?? ''
  const customerTaxId = extractField(text, /CNPJ\/CPF:\s*\n([\d.\-\/]+)/) ?? ''
  const installationNumber = extractField(text, /Número da Instalação:\s*\n(\d+)/) ?? ''
  const referenceMonth = extractField(text, /Mês de Referência:\s*\n(\S+)/) ?? ''
  const dueDate = extractField(text, /Vencimento:\s*\n(\d{2}\/\d{2}\/\d{4})/) ?? ''

  const consumptionMatch = text.match(/Consumo Total do Mês:\s*(\d+)\s*kWh/)
  const consumptionKwh = consumptionMatch ? parseInt(consumptionMatch[1], 10) : 0

  const amountMatch = text.match(/Valor a pagar:\s*\nR\$\s*([\d.,]+)/)
  const amountBrl = amountMatch ? parseBRL(amountMatch[1]) : 0

  const linhaDigitavel = extractField(
    text, /(\d{5}\.\d{5}\s+\d{5}\.\d{6}\s+\d{5}\.\d{6}\s+\d\s+\d{14})/,
  ) ?? ''

  const cleanDoc = customerTaxId.replace(/[.\-/]/g, '')
  const taxIdType = cleanDoc.length === 14 ? 'cnpj' as const : 'cpf' as const

  const confidence = buildExtractionConfidence({
    sourceMethod: 'pdf',
    fields: {
      customerName: { found: !!customerName },
      customerTaxId: { found: !!customerTaxId },
      accountNumber: { found: !!installationNumber },
      referenceMonth: { found: !!referenceMonth },
      dueDate: { found: !!dueDate },
      amountDue: { found: !!amountMatch },
      linhaDigitavel: { found: !!linhaDigitavel },
      consumption: { found: !!consumptionMatch },
    },
  })

  return {
    provider: {
      profileId: PROFILE_ID,
      companyName: 'Enliv',
      taxId: providerTaxId.replace(/[.\-/]/g, ''),
      category: 'electricity',
    },
    customer: {
      name: customerName,
      taxId: customerTaxId,
      taxIdType,
      countryCode: 'BR',
      accountNumber: installationNumber,
    },
    billing: {
      referenceMonth: normalizeMonth(referenceMonth),
      dueDate: normalizeDate(dueDate),
      amountDue: toMinorUnits(amountBrl),
      currency: 'BRL',
    },
    consumption: consumptionKwh > 0 ? { value: consumptionKwh, unit: 'kWh' } : undefined,
    payment: {
      linhaDigitavel: normalizeBarcode(linhaDigitavel),
    },
    confidence,
    rawSource: 'pdf',
  }
}

function extractField(text: string, pattern: RegExp): string | null {
  const match = text.match(pattern)
  return match ? match[1].trim() : null
}
