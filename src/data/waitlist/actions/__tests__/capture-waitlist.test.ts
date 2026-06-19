import { describe, it, expect, vi, beforeEach } from 'vitest'

import { captureWaitlistCore } from '@/data/waitlist/actions/capture-waitlist'
import { type Attribution } from '@/lib/analytics/utm'

const sendWaitlistWelcome = vi.fn()

// emailRoleFor is pure — keep the real mapping; spy only on the email send.
vi.mock('@/data/waitlist/actions/send-welcome', () => ({
  sendWaitlistWelcome: (...a: unknown[]) => sendWaitlistWelcome(...a),
  emailRoleFor: (role: string) => (role === 'tenant' ? 'tenant' : 'landlord'),
}))

// waitlist_capture returns whether the row was newly inserted.
function mockSupabase(data: boolean | null, error: { message: string } | null = null) {
  const rpc = vi.fn().mockResolvedValue({ data, error })
  return { client: { rpc } as never, rpc }
}

const fullAttribution: Attribution = {
  utm_source: 'facebook',
  utm_medium: 'cpc',
  utm_campaign: 'launch',
  utm_content: 'hero',
  utm_term: 'aluguel',
  referrer: 'https://t.co/x',
  landing_path: '/',
}

const emptyAttribution: Attribution = {
  utm_source: null,
  utm_medium: null,
  utm_campaign: null,
  utm_content: null,
  utm_term: null,
  referrer: null,
  landing_path: '/precos',
}

describe('captureWaitlistCore', () => {
  beforeEach(() => sendWaitlistWelcome.mockReset())

  it('forwards email, locale, role, and attribution to the capture RPC', async () => {
    const { client, rpc } = mockSupabase(true)
    const r = await captureWaitlistCore(client, {
      email: 'maria@example.com',
      locale: 'pt-BR',
      role: 'tenant',
      attribution: fullAttribution,
    })
    expect(r.success).toBe(true)
    expect(r.isNew).toBe(true)
    expect(rpc).toHaveBeenCalledWith('waitlist_capture', {
      p_email: 'maria@example.com',
      p_locale: 'pt-BR',
      p_role: 'tenant',
      p_utm_source: 'facebook',
      p_utm_medium: 'cpc',
      p_utm_campaign: 'launch',
      p_utm_content: 'hero',
      p_utm_term: 'aluguel',
      p_referrer: 'https://t.co/x',
      p_landing_path: '/',
    })
  })

  it('sends the welcome once on a new signup, in the toggle role flavor', async () => {
    const { client } = mockSupabase(true)
    await captureWaitlistCore(client, {
      email: 'maria@example.com',
      locale: 'pt-BR',
      role: 'tenant',
      attribution: fullAttribution,
    })
    expect(sendWaitlistWelcome).toHaveBeenCalledTimes(1)
    expect(sendWaitlistWelcome).toHaveBeenCalledWith('maria@example.com', 'pt-BR', 'tenant')
  })

  it('routes non-tenant roles to the landlord welcome', async () => {
    const { client } = mockSupabase(true)
    await captureWaitlistCore(client, {
      email: 'a@b.com',
      locale: 'en',
      role: 'landlord',
      attribution: emptyAttribution,
    })
    expect(sendWaitlistWelcome).toHaveBeenCalledWith('a@b.com', 'en', 'landlord')
  })

  it('does not welcome an already-listed email', async () => {
    const { client } = mockSupabase(false)
    const r = await captureWaitlistCore(client, {
      email: 'a@b.com',
      locale: 'en',
      role: 'landlord',
      attribution: emptyAttribution,
    })
    expect(r.success).toBe(true)
    expect(r.isNew).toBe(false)
    expect(sendWaitlistWelcome).not.toHaveBeenCalled()
  })

  it('sends null attribution fields as undefined (omitted) so the RPC defaults them', async () => {
    const { client, rpc } = mockSupabase(true)
    await captureWaitlistCore(client, {
      email: 'a@b.com',
      locale: 'en',
      role: 'landlord',
      attribution: emptyAttribution,
    })
    const args = rpc.mock.calls[0][1]
    expect(args.p_utm_source).toBeUndefined()
    expect(args.p_referrer).toBeUndefined()
    expect(args.p_landing_path).toBe('/precos')
  })

  it('returns failure and does not welcome when the RPC errors', async () => {
    const { client } = mockSupabase(null, { message: 'boom' })
    const r = await captureWaitlistCore(client, {
      email: 'a@b.com',
      locale: 'en',
      role: 'landlord',
      attribution: emptyAttribution,
    })
    expect(r.success).toBe(false)
    expect(r.isNew).toBe(false)
    expect(sendWaitlistWelcome).not.toHaveBeenCalled()
  })
})
