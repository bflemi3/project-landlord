import { describe, it, expect, vi, beforeEach } from 'vitest'
import { validateEnlivExtraction } from '../validate'
import type { BillExtractionResult } from '../../../types'
import { buildBillExtractionConfidence } from '../../../confidence'

function makeExtraction(overrides: Partial<BillExtractionResult> = {}): BillExtractionResult {
  return {
    provider: { profileId: 'test', companyName: 'Enliv', taxId: '49449868000162', category: 'electricity' },
    customer: { name: 'Test', taxId: '04003232909', taxIdType: 'cpf', countryCode: 'BR', accountNumber: '59069412' },
    billing: { referenceMonth: '2026-03', dueDate: '2026-04-24', amountDue: 21847, currency: 'BRL' },
    payment: { linhaDigitavel: '74891160090666030730432263871033514260000021847' },
    confidence: buildBillExtractionConfidence({ sourceMethod: 'pdf', fields: { amountDue: { found: true } } }),
    rawSource: 'pdf',
    ...overrides,
  }
}

describe('validateEnlivExtraction', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('returns valid when API data matches extraction', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({
        nome_cliente: 'Test',
        debitos: [{
          cadastroDistribuidora: '59069412',
          vencimento: '2026-04-24T00:00:00.000Z',
          valor: 218.47,
          linha_digitavel: '74891160090666030730432263871033514260000021847',
        }],
      }), { status: 200 }),
    )

    const result = await validateEnlivExtraction(makeExtraction())
    expect(result).not.toBeNull()
    expect(result!.valid).toBe(true)
    expect(result!.discrepancies).toHaveLength(0)
  })

  it('returns discrepancy when amount differs', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({
        nome_cliente: 'Test',
        debitos: [{
          cadastroDistribuidora: '59069412',
          vencimento: '2026-04-24T00:00:00.000Z',
          valor: 250.00,
          linha_digitavel: '74891160090666030730432263871033514260000021847',
        }],
      }), { status: 200 }),
    )

    const result = await validateEnlivExtraction(makeExtraction())
    expect(result!.valid).toBe(false)
    expect(result!.discrepancies).toContainEqual(
      expect.objectContaining({ field: 'amountDue' }),
    )
  })

  it('returns invalid when no matching barcode found', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({
        nome_cliente: 'Test',
        debitos: [{
          cadastroDistribuidora: '59069412',
          vencimento: '2026-04-24T00:00:00.000Z',
          valor: 218.47,
          linha_digitavel: '00000000000000000000000000000000000000000000000',
        }],
      }), { status: 200 }),
    )

    const result = await validateEnlivExtraction(makeExtraction())
    expect(result!.valid).toBe(false)
    expect(result!.discrepancies).toContainEqual(
      expect.objectContaining({ field: 'barcode' }),
    )
  })

  it('returns discrepancy when due date differs', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({
        nome_cliente: 'Test',
        debitos: [{
          cadastroDistribuidora: '59069412',
          vencimento: '2026-05-15T00:00:00.000Z',
          valor: 218.47,
          linha_digitavel: '74891160090666030730432263871033514260000021847',
        }],
      }), { status: 200 }),
    )

    const result = await validateEnlivExtraction(makeExtraction())
    expect(result!.valid).toBe(false)
    expect(result!.discrepancies).toContainEqual(
      expect.objectContaining({ field: 'dueDate', extracted: '2026-04-24', expected: '2026-05-15' }),
    )
  })

  it('returns null when API call fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('network error'))

    const result = await validateEnlivExtraction(makeExtraction())
    expect(result).toBeNull()
  })
})
