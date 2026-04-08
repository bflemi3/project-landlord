import { describe, it, expect } from 'vitest'
import { formatDays } from '../format-days'

describe('formatDays', () => {
  it('returns "today" for 0', () => {
    expect(formatDays(0)).toBe('today')
  })

  it('returns "1 day" for 1', () => {
    expect(formatDays(1)).toBe('1 day')
  })

  it('returns plural for values > 1', () => {
    expect(formatDays(3)).toBe('3 days')
    expect(formatDays(30)).toBe('30 days')
  })

  it('handles negative values (overdue) by using absolute value', () => {
    expect(formatDays(-1)).toBe('1 day')
    expect(formatDays(-6)).toBe('6 days')
    expect(formatDays(-30)).toBe('30 days')
  })

  it('returns "today" for -0', () => {
    expect(formatDays(-0)).toBe('today')
  })

  it('handles fractional days by showing the raw number', () => {
    // getDaysUntilPublishBy uses Math.ceil so this shouldn't happen,
    // but formatDays should still produce readable output
    expect(formatDays(0.5)).toBe('0.5 days')
    expect(formatDays(-2.7)).toBe('2.7 days')
  })

  it('handles large values', () => {
    expect(formatDays(365)).toBe('365 days')
    expect(formatDays(-90)).toBe('90 days')
  })
})
