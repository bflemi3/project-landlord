import { describe, it, expect, vi } from 'vitest'

import { completeWaitlistCore } from '@/data/waitlist/actions/complete-waitlist'
import { type WorkflowToken } from '@/schemas/waitlist'

// waitlist_complete returns a boolean (first-completion); the enrich step
// ignores it — the welcome already went out at capture.
function mockSupabase(error: { message: string } | null = null) {
  const rpc = vi.fn().mockResolvedValue({ data: true, error })
  return { client: { rpc } as never, rpc }
}

function input(overrides: Partial<Parameters<typeof completeWaitlistCore>[1]> = {}) {
  return {
    email: 'maria@example.com',
    role: 'landlord' as const,
    propertyCount: '2-5' as const,
    workflow: ['spreadsheet'] as WorkflowToken[],
    locale: 'en' as const,
    ...overrides,
  }
}

describe('completeWaitlistCore', () => {
  it('passes the full profile to the complete RPC', async () => {
    const { client, rpc } = mockSupabase()
    await completeWaitlistCore(client, input({ feedback: 'too much WhatsApp' }))
    expect(rpc).toHaveBeenCalledWith(
      'waitlist_complete',
      expect.objectContaining({
        p_email: 'maria@example.com',
        p_role: 'landlord',
        p_property_count: '2-5',
        p_workflow: ['spreadsheet'],
        p_feedback: 'too much WhatsApp',
        p_locale: 'en',
      }),
    )
  })

  it('returns success on a clean write', async () => {
    const { client } = mockSupabase()
    const r = await completeWaitlistCore(client, input())
    expect(r.success).toBe(true)
  })

  it('returns failure when the RPC errors', async () => {
    const { client } = mockSupabase({ message: 'boom' })
    const r = await completeWaitlistCore(client, input())
    expect(r.success).toBe(false)
  })
})
