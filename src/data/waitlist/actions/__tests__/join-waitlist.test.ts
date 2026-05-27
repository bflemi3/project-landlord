import { describe, it, expect, vi, beforeEach } from 'vitest'

const contactsCreate = vi.fn()
const emailsSend = vi.fn()

vi.mock('@/lib/resend/client', () => ({
  resend: {
    contacts: { create: (...a: unknown[]) => contactsCreate(...a) },
    emails: { send: (...a: unknown[]) => emailsSend(...a) },
  },
  RESEND_FROM: 'mabenn <noreply@test>',
  RESEND_REPLY_TO: 'hello@test',
  RESEND_WAITLIST_LANDLORD_SEGMENT_ID: 'landlord-seg',
  RESEND_WAITLIST_TENANT_SEGMENT_ID: 'tenant-seg',
}))
vi.mock('@/emails/waitlist-landlord', () => ({ WaitlistLandlord: () => null }))
vi.mock('@/emails/waitlist-tenant', () => ({ WaitlistTenant: () => null }))
vi.mock('@/emails/i18n', () => ({
  getEmailTranslations: () => ({
    waitlistWelcome: { landlord: { subject: 'Welcome, landlord' }, tenant: { subject: 'Welcome, tenant' } },
  }),
}))

const { joinWaitlistCore } = await import('@/data/waitlist/actions/join-waitlist')

// The RPC's boolean return is the dedup signal: true = newly inserted, false = already listed.
function mockSupabase(isNew: boolean) {
  const rpc = vi.fn().mockResolvedValue({ data: isNew, error: null })
  return { client: { rpc } as never, rpc }
}

describe('joinWaitlistCore — role routing + dedup', () => {
  beforeEach(() => {
    contactsCreate.mockReset()
    emailsSend.mockReset()
    contactsCreate.mockResolvedValue({ data: { id: 'c1' }, error: null })
    emailsSend.mockResolvedValue({ data: { id: 'e1' }, error: null })
  })

  it('routes a new landlord signup to the landlord segment and emails them', async () => {
    const { client, rpc } = mockSupabase(true)
    const res = await joinWaitlistCore(client, 'a@b.com', 'en', 'landlord')
    expect(res.success).toBe(true)
    expect(rpc).toHaveBeenCalledWith('join_waitlist', { p_email: 'a@b.com', p_role: 'landlord', p_locale: 'en' })
    expect(contactsCreate).toHaveBeenCalledWith(expect.objectContaining({ segments: [{ id: 'landlord-seg' }] }))
    expect(emailsSend).toHaveBeenCalledOnce()
  })

  it('routes a new tenant signup to the tenant segment', async () => {
    const { client, rpc } = mockSupabase(true)
    await joinWaitlistCore(client, 't@b.com', 'pt-BR', 'tenant')
    expect(rpc).toHaveBeenCalledWith('join_waitlist', { p_email: 't@b.com', p_role: 'tenant', p_locale: 'pt-BR' })
    expect(contactsCreate).toHaveBeenCalledWith(expect.objectContaining({ segments: [{ id: 'tenant-seg' }] }))
  })

  it('does not re-add or re-email when the signup is already on the list', async () => {
    const { client } = mockSupabase(false)
    const res = await joinWaitlistCore(client, 'dup@b.com', 'en', 'landlord')
    expect(res.success).toBe(true)
    expect(contactsCreate).not.toHaveBeenCalled()
    expect(emailsSend).not.toHaveBeenCalled()
  })

  it('fails and skips Resend when the DB write errors', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { message: 'boom' } })
    const res = await joinWaitlistCore({ rpc } as never, 'x@b.com', 'en', 'landlord')
    expect(res.success).toBe(false)
    expect(contactsCreate).not.toHaveBeenCalled()
    expect(emailsSend).not.toHaveBeenCalled()
  })
})
