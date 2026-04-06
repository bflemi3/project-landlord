import { describe, it, expect } from 'vitest'
import {
  getPublishByDay,
  getStatementUrgency,
  getDaysUntilPublishBy,
  getDaysUntilDue,
  getCurrentPeriod,
  formatPeriod,
} from '../statement-urgency'

describe('getPublishByDay', () => {
  it('returns payment due day minus 3', () => {
    expect(getPublishByDay(10)).toBe(7)
  })

  it('floors at 1 for early due days', () => {
    expect(getPublishByDay(3)).toBe(1)
    expect(getPublishByDay(2)).toBe(1)
    expect(getPublishByDay(1)).toBe(1)
  })
})

describe('getStatementUrgency', () => {
  // Payment due 10th → publish by 7th
  // Approaching = within 3 days of publish-by

  it('returns normal when well before publish-by date', () => {
    const now = new Date(2026, 3, 1) // April 1 — 6 days before publish-by (Apr 7)
    expect(getStatementUrgency(10, 2026, 4, now)).toBe('normal')
  })

  it('returns approaching when within 3 days of publish-by', () => {
    const now = new Date(2026, 3, 5) // April 5 — 2 days before publish-by (Apr 7)
    expect(getStatementUrgency(10, 2026, 4, now)).toBe('approaching')
  })

  it('returns approaching on exact 3-day boundary', () => {
    const now = new Date(2026, 3, 4) // April 4 — 3 days before publish-by (Apr 7)
    expect(getStatementUrgency(10, 2026, 4, now)).toBe('approaching')
  })

  it('returns overdue when past publish-by date', () => {
    const now = new Date(2026, 3, 8) // April 8 — 1 day after publish-by (Apr 7)
    expect(getStatementUrgency(10, 2026, 4, now)).toBe('overdue')
  })

  it('returns overdue on publish-by day itself (end of day)', () => {
    // On April 7 at any time, diffDays rounds to 0 which is < 0 false, <= 3 true → approaching
    // But if it's April 8, it's overdue
    const now = new Date(2026, 3, 7, 23, 59) // April 7 end of day
    expect(getStatementUrgency(10, 2026, 4, now)).toBe('approaching')
  })
})

describe('getDaysUntilPublishBy', () => {
  it('returns positive days when before publish-by', () => {
    const now = new Date(2026, 3, 1) // April 1
    // Publish by Apr 7 → 6 days
    expect(getDaysUntilPublishBy(10, 2026, 4, now)).toBe(6)
  })

  it('returns negative days when past publish-by', () => {
    const now = new Date(2026, 3, 9) // April 9
    // Publish by Apr 7 → -2 days
    expect(getDaysUntilPublishBy(10, 2026, 4, now)).toBe(-2)
  })
})

describe('getDaysUntilDue', () => {
  it('returns positive days when before payment due', () => {
    const now = new Date(2026, 3, 5) // April 5
    expect(getDaysUntilDue(10, 2026, 4, now)).toBe(5)
  })

  it('returns negative when past payment due', () => {
    const now = new Date(2026, 3, 12) // April 12
    expect(getDaysUntilDue(10, 2026, 4, now)).toBe(-2)
  })
})

describe('getCurrentPeriod', () => {
  it('returns year and 1-indexed month', () => {
    const now = new Date(2026, 3, 15) // April 15
    expect(getCurrentPeriod(now)).toEqual({ year: 2026, month: 4 })
  })
})

describe('formatPeriod', () => {
  it('formats as month + year in English', () => {
    expect(formatPeriod(2026, 4, 'en')).toContain('April')
    expect(formatPeriod(2026, 4, 'en')).toContain('2026')
  })

  it('formats in Portuguese', () => {
    const result = formatPeriod(2026, 4, 'pt-BR')
    expect(result.toLowerCase()).toContain('abril')
  })
})
