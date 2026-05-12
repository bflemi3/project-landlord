import { describe, it, expect } from 'vitest'
import {
  computeCardForProperty,
  daysUntil,
  leaseEndStateForDate,
  monthsBetween,
  parseISODate,
  rentEarnedMinor,
  rentIsActiveNow,
  summarizeCards,
} from '../shared'

const NOW = new Date(Date.UTC(2026, 4, 11)) // 2026-05-11

describe('monthsBetween', () => {
  it('counts whole months only', () => {
    expect(monthsBetween(parseISODate('2026-01-01'), parseISODate('2026-04-01'))).toBe(3)
  })
  it('rounds down a partial month', () => {
    expect(monthsBetween(parseISODate('2026-01-15'), parseISODate('2026-04-14'))).toBe(2)
  })
  it('returns 0 when end equals start', () => {
    expect(monthsBetween(parseISODate('2026-01-01'), parseISODate('2026-01-01'))).toBe(0)
  })
  it('returns 0 when end is before start', () => {
    expect(monthsBetween(parseISODate('2026-02-01'), parseISODate('2026-01-01'))).toBe(0)
  })
})

describe('daysUntil', () => {
  it('positive for future dates', () => {
    expect(daysUntil(parseISODate('2026-05-20'), NOW)).toBe(9)
  })
  it('zero for same day', () => {
    expect(daysUntil(parseISODate('2026-05-11'), NOW)).toBe(0)
  })
  it('negative for past dates', () => {
    expect(daysUntil(parseISODate('2026-05-01'), NOW)).toBe(-10)
  })
})

describe('leaseEndStateForDate', () => {
  it('returns none when end_date is null', () => {
    expect(leaseEndStateForDate(null, NOW)).toBe('none')
  })
  it('returns far when more than 60 days out', () => {
    expect(leaseEndStateForDate('2027-01-01', NOW)).toBe('far')
  })
  it('returns ending-soon at 60-day boundary', () => {
    expect(leaseEndStateForDate('2026-07-10', NOW)).toBe('ending-soon') // 60 days
  })
  it('returns ending-soon at 15 days', () => {
    expect(leaseEndStateForDate('2026-05-26', NOW)).toBe('ending-soon')
  })
  it('returns ending-imminent at 14 days', () => {
    expect(leaseEndStateForDate('2026-05-25', NOW)).toBe('ending-imminent')
  })
  it('returns ending-imminent at 0 days (today)', () => {
    expect(leaseEndStateForDate('2026-05-11', NOW)).toBe('ending-imminent')
  })
  it('returns ended for past dates', () => {
    expect(leaseEndStateForDate('2026-05-10', NOW)).toBe('ended')
  })
})

describe('rentEarnedMinor', () => {
  it('null when start_date is null', () => {
    expect(rentEarnedMinor({ amount_minor: 300000, start_date: null, end_date: null }, NOW)).toBeNull()
  })
  it('null when start_date is in the future', () => {
    expect(
      rentEarnedMinor({ amount_minor: 300000, start_date: '2026-06-01', end_date: null }, NOW),
    ).toBeNull()
  })
  it('whole months elapsed when end_date is null', () => {
    expect(
      rentEarnedMinor({ amount_minor: 300000, start_date: '2026-01-01', end_date: null }, NOW),
    ).toBe(4 * 300000)
  })
  it('caps at end_date when in the past', () => {
    expect(
      rentEarnedMinor(
        { amount_minor: 300000, start_date: '2025-01-01', end_date: '2025-12-31' },
        NOW,
      ),
    ).toBe(11 * 300000)
  })
  it('does not cap at end_date when end_date is in the future', () => {
    expect(
      rentEarnedMinor(
        { amount_minor: 300000, start_date: '2026-01-01', end_date: '2027-01-01' },
        NOW,
      ),
    ).toBe(4 * 300000)
  })
})

describe('rentIsActiveNow', () => {
  it('active when no dates', () => {
    expect(rentIsActiveNow({ amount_minor: 1, start_date: null, end_date: null }, NOW)).toBe(true)
  })
  it('not active when start_date is in the future', () => {
    expect(rentIsActiveNow({ amount_minor: 1, start_date: '2026-06-01', end_date: null }, NOW)).toBe(false)
  })
  it('not active when end_date is in the past', () => {
    expect(rentIsActiveNow({ amount_minor: 1, start_date: '2026-01-01', end_date: '2026-05-01' }, NOW)).toBe(false)
  })
  it('active when end_date equals today', () => {
    expect(rentIsActiveNow({ amount_minor: 1, start_date: '2026-01-01', end_date: '2026-05-11' }, NOW)).toBe(true)
  })
})

describe('computeCardForProperty', () => {
  const baseProperty = {
    id: 'p1',
    name: 'Casa Verde',
    street: 'Rua A',
    number: '123',
    complement: null,
    neighborhood: 'Centro',
    city: 'São Paulo',
    state: 'SP',
    postal_code: '01000-000',
    country_code: 'BR',
    property_type: 'apartment' as const,
  }

  it('renders dashes when there are no units', () => {
    const card = computeCardForProperty({ ...baseProperty, units: [] }, NOW)
    expect(card.earned_minor).toBeNull()
    expect(card.monthly_minor).toBeNull()
    expect(card.end_state).toBe('none')
  })

  it('renders dashes when units have no rent rows', () => {
    const card = computeCardForProperty(
      { ...baseProperty, units: [{ id: 'u1', deleted_at: null, rent: [] }] },
      NOW,
    )
    expect(card.earned_minor).toBeNull()
    expect(card.monthly_minor).toBeNull()
  })

  it('earned is null when rent has no start_date but monthly is set', () => {
    const card = computeCardForProperty(
      {
        ...baseProperty,
        units: [
          {
            id: 'u1',
            deleted_at: null,
            rent: [
              {
                amount_minor: 300000,
                currency: 'BRL',
                start_date: null,
                end_date: null,
              },
            ],
          },
        ],
      },
      NOW,
    )
    expect(card.earned_minor).toBeNull()
    expect(card.monthly_minor).toBe(300000)
  })

  it('future-start rent: earned is null, monthly is null (not active yet)', () => {
    const card = computeCardForProperty(
      {
        ...baseProperty,
        units: [
          {
            id: 'u1',
            deleted_at: null,
            rent: [
              {
                amount_minor: 300000,
                currency: 'BRL',
                start_date: '2026-06-01',
                end_date: null,
              },
            ],
          },
        ],
      },
      NOW,
    )
    expect(card.earned_minor).toBeNull()
    expect(card.monthly_minor).toBeNull()
  })

  it('sums rent across multiple active units (multi-unit property)', () => {
    const card = computeCardForProperty(
      {
        ...baseProperty,
        units: [
          {
            id: 'u1',
            deleted_at: null,
            rent: [
              {
                amount_minor: 300000,
                currency: 'BRL',
                start_date: '2026-01-01',
                end_date: null,
              },
            ],
          },
          {
            id: 'u2',
            deleted_at: null,
            rent: [
              {
                amount_minor: 200000,
                currency: 'BRL',
                start_date: '2026-02-01',
                end_date: null,
              },
            ],
          },
        ],
      },
      NOW,
    )
    expect(card.monthly_minor).toBe(500000)
    expect(card.earned_minor).toBe(4 * 300000 + 3 * 200000)
  })

  it('past end_date drops out of monthly, contributes capped earned, end_state is ended', () => {
    const card = computeCardForProperty(
      {
        ...baseProperty,
        units: [
          {
            id: 'u1',
            deleted_at: null,
            rent: [
              {
                amount_minor: 300000,
                currency: 'BRL',
                start_date: '2025-01-01',
                end_date: '2025-12-31',
              },
            ],
          },
        ],
      },
      NOW,
    )
    expect(card.monthly_minor).toBeNull()
    expect(card.earned_minor).toBe(11 * 300000)
    expect(card.end_state).toBe('ended')
    expect(card.end_date).toBe('2025-12-31')
  })

  it('end_state reflects nearest active end_date and ignores deleted units', () => {
    const card = computeCardForProperty(
      {
        ...baseProperty,
        units: [
          {
            id: 'u1',
            deleted_at: '2026-01-01',
            rent: [
              {
                amount_minor: 999999,
                currency: 'BRL',
                start_date: '2026-01-01',
                end_date: '2026-05-12',
              },
            ],
          },
          {
            id: 'u2',
            deleted_at: null,
            rent: [
              {
                amount_minor: 300000,
                currency: 'BRL',
                start_date: '2026-01-01',
                end_date: '2026-07-01',
              },
            ],
          },
        ],
      },
      NOW,
    )
    expect(card.monthly_minor).toBe(300000)
    expect(card.end_date).toBe('2026-07-01')
    expect(card.end_state).toBe('ending-soon')
  })
})

describe('summarizeCards', () => {
  it('buckets totals by currency and emits ending-soon entries sorted by urgency', () => {
    const cards = [
      {
        property_id: 'p1',
        property_name: 'Sol',
        property_address: {} as never,
        property_type: null,
        earned_minor: 1000,
        monthly_minor: 500,
        currency: 'BRL',
        end_date: '2026-07-01',
        end_state: 'ending-soon' as const,
        days_until_end: 51,
        _latest_end_date: '2026-07-01',
      },
      {
        property_id: 'p2',
        property_name: 'Lua',
        property_address: {} as never,
        property_type: null,
        earned_minor: 2000,
        monthly_minor: 700,
        currency: 'BRL',
        end_date: '2026-05-20',
        end_state: 'ending-imminent' as const,
        days_until_end: 9,
        _latest_end_date: '2026-05-20',
      },
      {
        property_id: 'p3',
        property_name: 'Far',
        property_address: {} as never,
        property_type: null,
        earned_minor: null,
        monthly_minor: null,
        currency: 'USD',
        end_date: '2027-01-01',
        end_state: 'far' as const,
        days_until_end: 235,
        _latest_end_date: '2027-01-01',
      },
    ]
    const summary = summarizeCards(cards, NOW)
    expect(summary.total_earned_minor).toEqual({ BRL: 3000 })
    expect(summary.total_monthly_minor).toEqual({ BRL: 1200 })
    expect(summary.ending_soon.map((e) => e.property_id)).toEqual(['p2', 'p1'])
  })

  it('omits ended leases from ending_soon and from totals when monthly is null', () => {
    const cards = [
      {
        property_id: 'p1',
        property_name: 'Past',
        property_address: {} as never,
        property_type: null,
        earned_minor: 5000,
        monthly_minor: null,
        currency: 'BRL',
        end_date: '2026-04-01',
        end_state: 'ended' as const,
        days_until_end: -40,
        _latest_end_date: '2026-04-01',
      },
    ]
    const summary = summarizeCards(cards, NOW)
    expect(summary.total_earned_minor).toEqual({ BRL: 5000 })
    expect(summary.total_monthly_minor).toEqual({})
    expect(summary.ending_soon).toEqual([])
  })
})
