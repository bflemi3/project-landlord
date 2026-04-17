import type { Provider } from '../types'
import type { BillExtractionResult, PaymentStatus, ValidationResult } from '../../types'
import { parseEnlivBillText } from './parser'
import { fetchEnlivDebitos, fetchEnlivPagas } from './api-client'
import { validateEnlivExtraction } from './validate'
import { normalizeDate, toMinorUnits, normalizeBarcode } from '../../normalize'
import { buildBillExtractionConfidence } from '../../confidence'

// Placeholder — will be replaced with the real provider_invoice_profiles.id
// when Enliv Campeche is created through the engineering playground
const PROFILE_ID = 'a1b2c3d4-0002-0002-0002-000000000001'

export const enlivCampeche: Provider = {
  profileId: PROFILE_ID,

  meta: {
    companyName: 'Enliv',
    companyTaxId: '49449868000162',
    countryCode: 'BR',
    displayName: 'Enliv (Campeche)',
    category: 'electricity',
    region: 'SC-florianopolis-campeche',
    status: 'active',
    capabilities: {
      extraction: true,
      apiLookup: true,
      validation: true,
      paymentStatus: true,
    },
  },

  identify(text: string): number | null {
    if (text.includes('49.449.868/0001-62') || text.includes('49449868000162')) {
      if (/[Cc]ampeche/.test(text)) return 0.95
      return 0.7
    }
    return null
  },

  extractBill(text: string): BillExtractionResult | null {
    return parseEnlivBillText(text)
  },

  async lookupBills(taxId: string): Promise<BillExtractionResult[] | null> {
    try {
      const data = await fetchEnlivDebitos(taxId)
      return data.debitos.map((d) => ({
        provider: { profileId: PROFILE_ID, companyName: 'Enliv', taxId: '49449868000162', category: 'electricity' as const },
        customer: { name: data.nome_cliente, taxId, taxIdType: taxId.replace(/[.\-/]/g, '').length === 14 ? 'cnpj' as const : 'cpf' as const, countryCode: 'BR', accountNumber: d.cadastroDistribuidora },
        billing: { referenceMonth: '', dueDate: normalizeDate(d.vencimento), amountDue: toMinorUnits(d.valor), currency: 'BRL' },
        payment: { linhaDigitavel: normalizeBarcode(d.linha_digitavel), pixPayload: d.emv_pix },
        confidence: buildBillExtractionConfidence({
          sourceMethod: 'api',
          fields: {
            customerName: { found: !!data.nome_cliente },
            accountNumber: { found: !!d.cadastroDistribuidora },
            dueDate: { found: !!d.vencimento },
            amountDue: { found: true },
            linhaDigitavel: { found: !!d.linha_digitavel },
          },
        }),
        rawSource: 'api' as const,
      }))
    } catch { return null }
  },

  async checkPaymentStatus(taxId: string): Promise<PaymentStatus[] | null> {
    try {
      const data = await fetchEnlivPagas(taxId)
      return data.debitos.map((d) => ({
        paid: true,
        paidDate: normalizeDate(d.vencimento),
        paidAmount: toMinorUnits(d.valor),
        source: 'provider-api' as const,
      }))
    } catch { return null }
  },

  async validateExtraction(extraction: BillExtractionResult): Promise<ValidationResult | null> {
    return validateEnlivExtraction(extraction)
  },
}
