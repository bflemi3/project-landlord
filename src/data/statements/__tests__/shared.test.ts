import { describe, it, expect } from 'vitest'
import {
  fetchStatement, statementQueryKey,
  fetchStatementCharges, statementChargesQueryKey,
  fetchMissingCharges, missingChargesQueryKey,
} from '../shared'
import type { TypedSupabaseClient } from '@/lib/supabase/types'

function mockSupabase(overrides: { data?: unknown; error?: unknown }) {
  const chain = {
    select: () => chain,
    eq: () => chain,
    is: () => chain,
    not: () => chain,
    order: () => chain,
    single: () => Promise.resolve({ data: overrides.data ?? null, error: overrides.error ?? null }),
    then: (resolve: (v: unknown) => void) =>
      resolve({ data: overrides.data ?? null, error: overrides.error ?? null }),
  }
  return { from: () => chain } as unknown as TypedSupabaseClient
}

describe('fetchStatement', () => {
  it('maps row to Statement shape', async () => {
    const row = {
      id: 's1', unit_id: 'u1', period_year: 2026, period_month: 3,
      status: 'draft', total_amount_minor: 200000, tenant_total_minor: 150000,
      landlord_total_minor: 50000, currency: 'BRL', published_at: null,
      revision: 1, created_at: '2026-03-01', updated_at: '2026-03-01',
    }
    const result = await fetchStatement(mockSupabase({ data: row }), 's1')
    expect(result).toEqual({
      id: 's1', unitId: 'u1', periodYear: 2026, periodMonth: 3,
      status: 'draft', totalAmountMinor: 200000, tenantTotalMinor: 150000,
      landlordTotalMinor: 50000, currency: 'BRL', publishedAt: null,
      revision: 1, createdAt: '2026-03-01', updatedAt: '2026-03-01',
    })
  })

  it('throws on error', async () => {
    await expect(fetchStatement(mockSupabase({ error: { message: 'fail' } }), 's1'))
      .rejects.toThrow('Statement not found')
  })
})

describe('fetchStatementCharges', () => {
  it('returns empty array on error', async () => {
    const result = await fetchStatementCharges(mockSupabase({ error: { message: 'fail' } }), 's1')
    expect(result).toEqual([])
  })

  it('returns empty array when data is null', async () => {
    const result = await fetchStatementCharges(mockSupabase({ data: null }), 's1')
    expect(result).toEqual([])
  })

  it('maps rows with source document', async () => {
    const rows = [{
      id: 'ci1', statement_id: 's1', charge_definition_id: 'cd1',
      source_document_id: 'sd1', name: 'Rent', amount_minor: 150000,
      currency: 'BRL', charge_source: 'manual', split_type: 'percentage',
      landlord_percentage: 0, tenant_percentage: 100,
      landlord_fixed_minor: null, tenant_fixed_minor: null,
      source_documents: { id: 'sd1', file_name: 'bill.pdf', mime_type: 'application/pdf', file_path: '/bills/bill.pdf' },
      charge_definitions: { charge_type: 'rent' },
    }]
    const result = await fetchStatementCharges(mockSupabase({ data: rows }), 's1')
    expect(result).toHaveLength(1)
    expect(result[0].sourceDocument).toEqual({
      id: 'sd1', fileName: 'bill.pdf', mimeType: 'application/pdf', filePath: '/bills/bill.pdf',
    })
    expect(result[0].chargeType).toBe('rent')
  })
})

describe('fetchMissingCharges', () => {
  it('returns empty array on definitions error', async () => {
    const result = await fetchMissingCharges(mockSupabase({ error: { message: 'fail' } }), 'u1', 's1', 2026, 3)
    expect(result).toEqual([])
  })
})

describe('query key functions', () => {
  it('statementQueryKey', () => expect(statementQueryKey('s1')).toEqual(['statement', 's1']))
  it('statementChargesQueryKey', () => expect(statementChargesQueryKey('s1')).toEqual(['statement-charges', 's1']))
  it('missingChargesQueryKey', () => expect(missingChargesQueryKey('u1', 's1')).toEqual(['missing-charges', 'u1', 's1']))
})
