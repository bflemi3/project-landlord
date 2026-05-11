import { describe, it, expect, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'

vi.mock('next/cache', () => ({ revalidatePath: () => {} }))

vi.mock('@/lib/resend/client', () => ({
  resend: { emails: { send: vi.fn() } },
  RESEND_FROM: 'mabenn <noreply@mabenn.com>',
  RESEND_REPLY_TO: 'hello@mabenn.com',
  RESEND_WAITLIST_SEGMENT_ID: 'test-segment',
}))

const { createPropertyCore } = await import('../create-property')

function makeAuthedStub(userId = 'user-1'): SupabaseClient<any> {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: userId } } }),
    },
    rpc: vi.fn(),
    from: vi.fn(),
    storage: { from: vi.fn() },
  } as unknown as SupabaseClient<any>
}

function brAddress() {
  return {
    name: '',
    country_code: 'BR',
    property_type: null,
    postal_code: '01310-100',
    street: 'Rua Teste',
    number: '123',
    city: 'Sao Paulo',
    state: 'SP',
    complement: '',
    neighborhood: '',
  }
}

describe('createPropertyCore — validation', () => {
  it('returns unauthenticated when auth.getUser returns no user', async () => {
    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    } as unknown as SupabaseClient<any>

    const result = await createPropertyCore(supabase, {
      draftId: 'a',
      path: 'no_contract',
      property: brAddress(),
      tax_id: { tax_id: '' },
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.globalErrors).toEqual([{ code: 'unauthenticated' }])
  })

  it('projects per-section errors when composed schema rejects the input', async () => {
    const supabase = makeAuthedStub()

    const result = await createPropertyCore(supabase, {
      draftId: 'a',
      path: 'no_contract',
      property: { ...brAddress(), street: '' },
      tax_id: { tax_id: '' },
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.sectionErrors?.property).toBeDefined()
    const propertySlice = result.sectionErrors?.property as Record<
      string,
      string[]
    >
    expect(propertySlice.street).toContain('required')
    expect(vi.mocked(supabase.rpc)).not.toHaveBeenCalled()
  })

  it('contract-path missing contract returns ok:false with a global toast', async () => {
    const supabase = makeAuthedStub()

    const result = await createPropertyCore(supabase, {
      draftId: 'a',
      path: 'contract',
      property: brAddress(),
      tax_id: { tax_id: '' },
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    // Cross-section invariant (contract path requires `contract` + `rent`)
    // doesn't sit in any one form's scope, so the action surfaces it via a
    // generic global toast — the wizard's accordion focus logic stays out.
    expect(result.globalErrors).toBeDefined()
    expect(result.globalErrors?.length).toBeGreaterThan(0)
  })

  it('contract validation failure emits contract_validation_failed global, not a section error', async () => {
    const supabase = makeAuthedStub()

    // Bogus mime type fails `contractInputSchema`. Pair with `rent` so the
    // contract-path cross-invariant passes and only the contract parse
    // contributes to the envelope.
    const result = await createPropertyCore(supabase, {
      draftId: 'a',
      path: 'contract',
      property: brAddress(),
      tax_id: { tax_id: '' },
      rent: {
        amount_minor: 100_000,
        currency: 'BRL',
        due_day_of_month: 5,
        start_date: null,
        end_date: null,
        adjustment_frequency: null,
        adjustment_method: null,
        adjustment_index: null,
        adjustment_amount_minor: null,
        adjustment_basis_points: null,
        includes: null,
      },
      contract: {
        mime_type: 'application/x-bogus' as never,
        bytes: 100,
        original_filename: 'contract.pdf',
        extension: 'pdf',
        extraction: null,
      },
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.globalErrors).toContainEqual({
      code: 'contract_validation_failed',
    })
    expect(result.sectionErrors?.property).toBeUndefined()
  })
})
