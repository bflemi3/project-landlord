/**
 * Unit tests for the /auth/enter-code page's error surface.
 *
 * Today the page collapses every redemption failure to a single invalid-code
 * message and ignores the URL's `?error=` query param entirely, which means:
 *   - A user whose redemption failed with rpc_error at /auth/redeem gets
 *     redirected to /auth/enter-code?error=server and sees… nothing. The
 *     error param is dropped on the floor.
 *   - A user whose redemption server action returned { success: false,
 *     reason: 'rpc_error' } is told "your code is wrong" even though the
 *     server failed. They'll retry the same (valid) code forever.
 *
 * These tests describe the desired UX and are EXPECTED TO FAIL against the
 * current implementation.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'

const redeemInviteCodeMock = vi.fn()
const pushMock = vi.fn()
const replaceMock = vi.fn()
const getUserMock = vi.fn()
const profileSingleMock = vi.fn()

let mockSearchParams = new URLSearchParams()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
  useSearchParams: () => ({
    get: (key: string) => mockSearchParams.get(key),
  }),
}))

vi.mock('@/app/actions/redeem-invite', () => ({
  redeemInviteCode: (...args: unknown[]) => redeemInviteCodeMock(...args),
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: () => getUserMock(),
      signOut: () => Promise.resolve(),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => profileSingleMock(),
        }),
      }),
    }),
  }),
}))

const messages = {
  auth: {
    tagline: 'Shared billing you can trust',
    inviteCode: 'Invite code',
    inviteCodePlaceholder: 'Enter your invite code',
    inviteCodeTitle: 'Enter your invite code',
    inviteCodeDescription: 'You should have received a code in your email.',
    continueWithCode: 'Continue',
    invalidInviteCode: 'This code is incorrect or has expired. Double-check and try again.',
    serverErrorInviteCode: 'Server error — please try again in a moment.',
    signOut: 'Sign out',
  },
}

async function renderPage() {
  const { default: EnterCodePage } = await import('@/app/auth/enter-code/page')
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <EnterCodePage />
    </NextIntlClientProvider>,
  )
}

describe('EnterCodePage — error surfacing', () => {
  beforeEach(() => {
    redeemInviteCodeMock.mockReset()
    pushMock.mockReset()
    replaceMock.mockReset()
    getUserMock.mockReset()
    profileSingleMock.mockReset()
    mockSearchParams = new URLSearchParams()
    getUserMock.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    profileSingleMock.mockResolvedValue({ data: { has_redeemed_invite: false } })
    // Prevent actual navigation on success.
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { href: '' },
    })
  })

  afterEach(() => {
    cleanup()
    vi.resetModules()
  })

  it('shows a distinct server-error message when URL has ?error=server', async () => {
    mockSearchParams = new URLSearchParams('error=server')
    await renderPage()

    // Wait for the auth gate to resolve and render the form.
    await screen.findByText(messages.auth.inviteCodeTitle)

    expect(await screen.findByText(messages.auth.serverErrorInviteCode)).toBeInTheDocument()
    expect(screen.queryByText(messages.auth.invalidInviteCode)).not.toBeInTheDocument()
  })

  it('does NOT show any error message when URL has no ?error param', async () => {
    await renderPage()

    await screen.findByText(messages.auth.inviteCodeTitle)

    expect(screen.queryByText(messages.auth.serverErrorInviteCode)).not.toBeInTheDocument()
    expect(screen.queryByText(messages.auth.invalidInviteCode)).not.toBeInTheDocument()
  })

  it('shows server-error message when the action returns reason=rpc_error', async () => {
    redeemInviteCodeMock.mockResolvedValue({ success: false, reason: 'rpc_error' })
    await renderPage()

    await screen.findByText(messages.auth.inviteCodeTitle)

    fireEvent.change(screen.getByLabelText(messages.auth.inviteCode), {
      target: { value: 'VALID-LOOKING-CODE' },
    })
    fireEvent.click(screen.getByRole('button', { name: messages.auth.continueWithCode }))

    await waitFor(() => {
      expect(screen.getByText(messages.auth.serverErrorInviteCode)).toBeInTheDocument()
    })
    expect(screen.queryByText(messages.auth.invalidInviteCode)).not.toBeInTheDocument()
  })

  it('shows server-error message when the action returns reason=rpc_empty', async () => {
    redeemInviteCodeMock.mockResolvedValue({ success: false, reason: 'rpc_empty' })
    await renderPage()

    await screen.findByText(messages.auth.inviteCodeTitle)

    fireEvent.change(screen.getByLabelText(messages.auth.inviteCode), {
      target: { value: 'ANY-CODE' },
    })
    fireEvent.click(screen.getByRole('button', { name: messages.auth.continueWithCode }))

    await waitFor(() => {
      expect(screen.getByText(messages.auth.serverErrorInviteCode)).toBeInTheDocument()
    })
  })

  it('shows invalid-code message when the action returns reason=invalid_or_mismatch', async () => {
    redeemInviteCodeMock.mockResolvedValue({ success: false, reason: 'invalid_or_mismatch' })
    await renderPage()

    await screen.findByText(messages.auth.inviteCodeTitle)

    fireEvent.change(screen.getByLabelText(messages.auth.inviteCode), {
      target: { value: 'WRONG-CODE' },
    })
    fireEvent.click(screen.getByRole('button', { name: messages.auth.continueWithCode }))

    await waitFor(() => {
      expect(screen.getByText(messages.auth.invalidInviteCode)).toBeInTheDocument()
    })
    expect(screen.queryByText(messages.auth.serverErrorInviteCode)).not.toBeInTheDocument()
  })

  it('pre-populates the invite code input from ?code= query param', async () => {
    // After a server-side rpc_error redirect, the upstream routes preserve the
    // invite code in the URL. The form should seed the input so the user can
    // retry with a single click — not re-type a code they already submitted.
    mockSearchParams = new URLSearchParams('error=server&code=PRESERVED-CODE')
    await renderPage()

    await screen.findByText(messages.auth.inviteCodeTitle)

    const input = screen.getByLabelText(messages.auth.inviteCode) as HTMLInputElement
    expect(input.value).toBe('PRESERVED-CODE')
  })
})
