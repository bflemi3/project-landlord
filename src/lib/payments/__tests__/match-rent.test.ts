import { describe, expect, it } from 'vitest'

import { matchRentCredit, type LedgerCandidate } from '../match-rent'

function candidate(overrides: Partial<LedgerCandidate> = {}): LedgerCandidate {
  return {
    id: 'cand-1',
    amount_minor: 250_000,
    currency: 'BRL',
    due_date: '2026-07-05',
    ...overrides,
  }
}

describe('matchRentCredit', () => {
  // M1 — one candidate, within window, exact amount+currency
  it('M1: returns the single candidate when amount + currency + within window', () => {
    const result = matchRentCredit({
      transaction: {
        amount_minor: 250_000,
        currency: 'BRL',
        posted_at: '2026-07-02T10:00:00Z', // due_date - 3d
      },
      candidates: [candidate({ id: 'a' })],
    })
    expect(result?.id).toBe('a')
  })

  // M2 — outside the window
  it('M2: returns null when |posted_at - due_date| > 10d', () => {
    const result = matchRentCredit({
      transaction: {
        amount_minor: 250_000,
        currency: 'BRL',
        posted_at: '2026-06-24T10:00:00Z', // due_date - 11d
      },
      candidates: [candidate({ id: 'a' })],
    })
    expect(result).toBeNull()
  })

  // M3 — two viable candidates in window → ambiguous → null
  it('M3: returns null when more than one candidate is viable (ambiguous)', () => {
    const result = matchRentCredit({
      transaction: {
        amount_minor: 250_000,
        currency: 'BRL',
        posted_at: '2026-07-05T10:00:00Z',
      },
      candidates: [
        candidate({ id: 'a', due_date: '2026-07-05' }),
        candidate({ id: 'b', due_date: '2026-07-05' }),
      ],
    })
    expect(result).toBeNull()
  })

  // M4 — currency mismatch
  it('M4: returns null when currency differs', () => {
    const result = matchRentCredit({
      transaction: {
        amount_minor: 250_000,
        currency: 'USD',
        posted_at: '2026-07-05T10:00:00Z',
      },
      candidates: [candidate({ id: 'a', currency: 'BRL' })],
    })
    expect(result).toBeNull()
  })

  // M5 — amount off by one minor unit
  it('M5: returns null when amount differs by 1 minor unit (exact match required)', () => {
    const result = matchRentCredit({
      transaction: {
        amount_minor: 249_999,
        currency: 'BRL',
        posted_at: '2026-07-05T10:00:00Z',
      },
      candidates: [candidate({ id: 'a', amount_minor: 250_000 })],
    })
    expect(result).toBeNull()
  })

  // M6 — exact-day boundary
  it('M6: matches when posted_at is exactly the due_date (window includes 0d)', () => {
    const result = matchRentCredit({
      transaction: {
        amount_minor: 250_000,
        currency: 'BRL',
        posted_at: '2026-07-05T23:59:00Z',
      },
      candidates: [candidate({ id: 'a' })],
    })
    expect(result?.id).toBe('a')
  })

  it('returns null when there are no candidates', () => {
    const result = matchRentCredit({
      transaction: {
        amount_minor: 250_000,
        currency: 'BRL',
        posted_at: '2026-07-05T10:00:00Z',
      },
      candidates: [],
    })
    expect(result).toBeNull()
  })
})
