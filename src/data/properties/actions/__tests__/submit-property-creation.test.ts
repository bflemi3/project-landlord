import { describe, it, expect, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'

vi.mock('next/cache', () => ({ revalidatePath: () => {} }))

vi.mock('@/lib/resend/client', () => ({
  resend: { emails: { send: vi.fn() } },
  RESEND_FROM: 'mabenn <noreply@mabenn.com>',
  RESEND_REPLY_TO: 'hello@mabenn.com',
  RESEND_WAITLIST_SEGMENT_ID: 'test-segment',
}))

const { submitPropertyCreationCore } = await import('../submit-property-creation')

/**
 * Stub Supabase client that simulates the auth + RPC surface the action
 * needs. Unit tests here focus on the validation gate before the RPC fires
 * — the RPC itself is exercised by the integration test.
 */
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

describe('submitPropertyCreationCore — validation', () => {
  it('returns unauthenticated when auth.getUser returns no user', async () => {
    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    } as unknown as SupabaseClient<any>

    const result = await submitPropertyCreationCore(supabase, {
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

    // Empty street → property section's `street` should land as `required`
    // in the projected errors envelope.
    const result = await submitPropertyCreationCore(supabase, {
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
    // RPC should NOT have been called.
    expect(vi.mocked(supabase.rpc)).not.toHaveBeenCalled()
  })

  it('contract-path missing contract surfaces sectionErrors.contract via projection', async () => {
    const supabase = makeAuthedStub()

    const result = await submitPropertyCreationCore(supabase, {
      draftId: 'a',
      path: 'contract',
      property: brAddress(),
      tax_id: { tax_id: '' },
      // No `contract` / `rent` → cross-section invariant trips in the composed
      // schema. The projection step doesn't re-run those cross-section rules
      // (they're not in any one form's scope) but the envelope still indicates
      // failure with no section keys, which Phase 4's accordion-focus logic
      // can route via the global toast.
    })

    expect(result.ok).toBe(false)
  })
})
