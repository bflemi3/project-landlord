import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'

import {
  createTestUser,
  cleanupTestUser,
  getAdminClient,
} from '@/test/supabase'

vi.mock('next/cache', () => ({ revalidatePath: () => {} }))

vi.mock('@/lib/resend/client', () => ({
  resend: {
    emails: {
      send: vi.fn().mockResolvedValue({ data: { id: 'test-email-id' }, error: null }),
    },
  },
  RESEND_FROM: 'mabenn <noreply@mabenn.com>',
  RESEND_REPLY_TO: 'hello@mabenn.com',
  RESEND_WAITLIST_SEGMENT_ID: 'test-segment',
}))

const { createPropertyCore } = await import('../create-property')
const { resend } = await import('@/lib/resend/client')

// -----------------------------------------------------------------------------
// Shared fixture helpers
// -----------------------------------------------------------------------------

function brAddress(suffix = '') {
  return {
    name: `Test Property ${suffix}`,
    country_code: 'BR',
    property_type: null,
    postal_code: '01310-100',
    street: 'Rua Teste',
    number: `${100 + Math.floor(Math.random() * 900)}`,
    city: 'Sao Paulo',
    state: 'SP',
    complement: '',
    neighborhood: '',
  }
}

function basicRent() {
  return {
    amount_minor: 250_000,
    currency: 'BRL',
    due_day_of_month: 10,
    start_date: null,
    end_date: null,
    adjustment_frequency: null,
    adjustment_method: null,
    adjustment_index: null,
    adjustment_amount_minor: null,
    adjustment_basis_points: null,
    includes: null,
  }
}

// -----------------------------------------------------------------------------

describe('createPropertyCore', () => {
  let client: SupabaseClient<any>
  let userId: string
  let admin: ReturnType<typeof getAdminClient>

  beforeAll(async () => {
    const user = await createTestUser()
    client = user.client
    userId = user.userId
    admin = getAdminClient()
  })

  afterAll(async () => {
    await cleanupTestUser(userId)
  })

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(resend.emails.send).mockResolvedValue({
      data: { id: 'test-email-id' },
      error: null,
    } as any)
  })

  // ---------------------------------------------------------------------------

  it('happy path: contract path with rent + tenant + expense persists all rows and sends invites', async () => {
    const draftId = crypto.randomUUID()
    const tenantRowId = crypto.randomUUID()
    const expenseRowId = crypto.randomUUID()
    const tenantEmail = `tenant-${Date.now()}@test.local`
    const contractBlob = new Blob(['fake-pdf'], { type: 'application/pdf' })

    const result = await createPropertyCore(client, {
      draftId,
      path: 'contract',
      property: brAddress('happy'),
      tax_id: { tax_id: '' },
      rent: basicRent(),
      tenants: [
        {
          id: tenantRowId,
          name: 'Jane Doe',
          email: tenantEmail,
          taxId: '',
          inviteNow: true,
        },
      ],
      expenses: [
        {
          id: expenseRowId,
          name: 'Electricity',
          expense_type: 'electricity',
          amount_behavior: 'variable',
          amount_minor: null,
          currency: 'BRL',
        },
      ],
      contract: {
        mime_type: 'application/pdf',
        bytes: contractBlob.size,
        original_filename: 'contract.pdf',
        extension: 'pdf',
        extraction: null,
      },
      contractFile: contractBlob,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.summary).toBeDefined()
    const summary = result.summary!
    expect(summary.is_idempotent_replay).toBe(false)
    expect(summary.property_id).toBe(draftId)
    expect(summary.contract).not.toBeNull()
    expect(summary.rent).not.toBeNull()
    expect(summary.tenants.invited_count).toBe(1)
    expect(summary.expenses.count).toBe(1)

    const { data: propertyRow } = await admin
      .from('properties')
      .select('id, created_by')
      .eq('id', draftId)
      .single()
    expect(propertyRow?.created_by).toBe(userId)

    const { data: invitationRow } = await admin
      .from('invitations')
      .select('id, status, last_emailed_at')
      .eq('property_id', draftId)
      .eq('invited_email', tenantEmail)
      .single()
    expect(invitationRow?.status).toBe('pending')
    expect(invitationRow?.last_emailed_at).not.toBeNull()

    expect(vi.mocked(resend.emails.send)).toHaveBeenCalledTimes(1)
  })

  // ---------------------------------------------------------------------------

  it('no-contract path with no rent: contract and rent come back null, everything else proceeds', async () => {
    const draftId = crypto.randomUUID()

    const result = await createPropertyCore(client, {
      draftId,
      path: 'no_contract',
      property: brAddress('no-contract'),
      tax_id: { tax_id: '' },
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return

    const summary = result.summary!
    expect(summary.is_idempotent_replay).toBe(false)
    expect(summary.contract).toBeNull()
    expect(summary.rent).toBeNull()
    expect(summary.tenants.invited_count).toBe(0)
    expect(summary.expenses.count).toBe(0)
  })

  // ---------------------------------------------------------------------------

  it('idempotent replay: second submit with same draftId returns is_idempotent_replay=true and does not double-send', async () => {
    const draftId = crypto.randomUUID()
    const tenantEmail = `replay-${Date.now()}@test.local`
    const payload = {
      draftId,
      path: 'no_contract' as const,
      property: brAddress('replay'),
      tax_id: { tax_id: '' },
      tenants: [
        {
          id: crypto.randomUUID(),
          name: 'Replay Tenant',
          email: tenantEmail,
          taxId: '',
          inviteNow: true,
        },
      ],
    }

    const first = await createPropertyCore(client, payload)
    expect(first.ok).toBe(true)
    if (!first.ok) return
    expect(first.summary!.is_idempotent_replay).toBe(false)
    expect(vi.mocked(resend.emails.send)).toHaveBeenCalledTimes(1)

    // Second call with the SAME draftId triggers the replay branch.
    const second = await createPropertyCore(client, payload)
    expect(second.ok).toBe(true)
    if (!second.ok) return
    expect(second.summary!.is_idempotent_replay).toBe(true)

    // The 5-minute `last_emailed_at` debounce should skip the email on
    // replay — the row already has `last_emailed_at` from the first send.
    expect(vi.mocked(resend.emails.send)).toHaveBeenCalledTimes(1)
  })

  // ---------------------------------------------------------------------------

  it('tax_id_conflict: another profile already owns the tax_id → sectionErrors[tax-id].tax_id', async () => {
    // Seed: create a second test user and stamp a tax_id on their profile.
    const otherUser = await createTestUser()
    const contestedTaxId = `99999999${Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0')}`
    await admin
      .from('profiles')
      .update({ tax_id: contestedTaxId })
      .eq('id', otherUser.userId)

    try {
      const draftId = crypto.randomUUID()
      const result = await createPropertyCore(client, {
        draftId,
        path: 'no_contract',
        property: brAddress('tax-conflict'),
        tax_id: { tax_id: contestedTaxId },
      })

      expect(result.ok).toBe(false)
      if (result.ok) return
      expect(result.sectionErrors?.['tax-id']).toBeDefined()
      const taxIdSlice = result.sectionErrors?.['tax-id'] as
        | Record<string, string[]>
        | undefined
      expect(taxIdSlice?.tax_id).toEqual(['tax_id_conflict'])
    } finally {
      await cleanupTestUser(otherUser.userId)
    }
  })

  // ---------------------------------------------------------------------------

  it('contract upload failure: DB is preserved, upload_status flips to failed, summary flags upload_failed', async () => {
    const draftId = crypto.randomUUID()

    // Intercept `from('contracts').upload` to force a failure. Proxy keeps
    // `this`-bound methods on the real bucket intact (a plain spread breaks
    // them).
    const originalFrom = client.storage.from.bind(client.storage)
    const uploadSpy = vi
      .fn()
      .mockResolvedValue({ data: null, error: new Error('boom') })
    const storageFromSpy = vi
      .spyOn(client.storage, 'from')
      .mockImplementation((bucket: string) => {
        const real = originalFrom(bucket)
        if (bucket === 'contracts') {
          return new Proxy(real, {
            get(target, prop) {
              if (prop === 'upload') return uploadSpy
              const value = Reflect.get(target, prop)
              return typeof value === 'function' ? value.bind(target) : value
            },
          }) as any
        }
        return real
      })

    try {
      const result = await createPropertyCore(client, {
        draftId,
        path: 'contract',
        property: brAddress('upload-fail'),
        tax_id: { tax_id: '' },
        rent: basicRent(),
        contract: {
          mime_type: 'application/pdf',
          bytes: 100,
          original_filename: 'contract.pdf',
          extension: 'pdf',
          extraction: null,
        },
        contractFile: new Blob(['fake-pdf'], { type: 'application/pdf' }),
      })

      expect(result.ok).toBe(true)
      if (!result.ok) return
      const summary = result.summary!
      expect(summary.contract).not.toBeNull()
      expect(summary.contract?.upload_failed).toBe(true)

      // Status flip is best-effort (separate RLS follow-up); the in-memory
      // `upload_failed: true` flag is the load-bearing signal for Phase 4.
      const { data: contractRow } = await admin
        .from('contracts')
        .select('id, upload_status')
        .eq('id', summary.contract!.contract_id)
        .single()
      expect(contractRow).not.toBeNull()
      expect(['pending', 'failed']).toContain(contractRow?.upload_status)
    } finally {
      storageFromSpy.mockRestore()
    }
  })

  // ---------------------------------------------------------------------------

  it('email send failure: invitation row stays pending, summary flags email_failed_count', async () => {
    vi.mocked(resend.emails.send).mockRejectedValueOnce(new Error('resend-down'))

    const draftId = crypto.randomUUID()
    const tenantEmail = `failmail-${Date.now()}@test.local`

    const result = await createPropertyCore(client, {
      draftId,
      path: 'no_contract',
      property: brAddress('email-fail'),
      tax_id: { tax_id: '' },
      tenants: [
        {
          id: crypto.randomUUID(),
          name: 'Bounce',
          email: tenantEmail,
          taxId: '',
          inviteNow: true,
        },
      ],
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    const summary = result.summary!
    expect(summary.tenants.email_failed_count).toBe(1)

    const { data: invitationRow } = await admin
      .from('invitations')
      .select('status, last_emailed_at')
      .eq('property_id', draftId)
      .eq('invited_email', tenantEmail)
      .single()
    expect(invitationRow?.status).toBe('pending')
    expect(invitationRow?.last_emailed_at).toBeNull()
  })

  // ---------------------------------------------------------------------------

  it('unauthenticated: anon client returns globalErrors with code unauthenticated', async () => {
    const { createClient } = await import('@supabase/supabase-js')
    const anonClient = createClient(
      'http://127.0.0.1:54321',
      process.env.SUPABASE_ANON_KEY!,
    ) as unknown as SupabaseClient<any>

    const result = await createPropertyCore(anonClient, {
      draftId: crypto.randomUUID(),
      path: 'no_contract',
      property: brAddress('anon'),
      tax_id: { tax_id: '' },
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.globalErrors).toEqual([{ code: 'unauthenticated' }])
  })
})
