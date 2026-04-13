import { describe, it, expect } from 'vitest'
import { formatReport, meetsThreshold } from '../reporter'
import type { AccuracyReport } from '../types'

const makeReport = (overrides?: Partial<AccuracyReport>): AccuracyReport => ({
  profileId: 'test-profile',
  totalCases: 3,
  identification: { tested: 3, passed: 2, failed: 1 },
  extraction: {
    casesScored: 2,
    totalFields: 8,
    passedFields: 7,
    accuracy: 0.875,
  },
  validation: { tested: 2, passed: 1, failed: 1 },
  caseResults: [],
  fieldAccuracy: {
    'billing.amountDue': { total: 2, passed: 2, accuracy: 1 },
    'billing.dueDate': { total: 2, passed: 1, accuracy: 0.5 },
  },
  ...overrides,
})

describe('formatReport', () => {
  it('includes extraction accuracy percentage', () => {
    const output = formatReport(makeReport())
    expect(output).toContain('87.5%')
  })

  it('includes identification stats', () => {
    const output = formatReport(makeReport())
    expect(output).toContain('Identification')
    expect(output).toContain('2/3')
  })

  it('includes validation stats', () => {
    const output = formatReport(makeReport())
    expect(output).toContain('Validation')
    expect(output).toContain('1/2')
  })

  it('includes per-field accuracy', () => {
    const output = formatReport(makeReport())
    expect(output).toContain('billing.amountDue')
    expect(output).toContain('100.0%')
    expect(output).toContain('billing.dueDate')
    expect(output).toContain('50.0%')
  })

  it('shows provider ID when set', () => {
    const output = formatReport(makeReport({ profileId: 'enliv-campeche-id' }))
    expect(output).toContain('enliv-campeche-id')
  })

  it('shows "All providers" when profileId is null', () => {
    const output = formatReport(makeReport({ profileId: null }))
    expect(output).toContain('All providers')
  })

  it('skips identification section when none tested', () => {
    const output = formatReport(makeReport({
      identification: { tested: 0, passed: 0, failed: 0 },
    }))
    expect(output).not.toContain('Identification')
  })

  it('skips validation section when none tested', () => {
    const output = formatReport(makeReport({
      validation: { tested: 0, passed: 0, failed: 0 },
    }))
    expect(output).not.toContain('Validation')
  })
})

describe('meetsThreshold', () => {
  it('returns true when extraction accuracy >= threshold', () => {
    expect(meetsThreshold(makeReport({ extraction: { casesScored: 2, totalFields: 8, passedFields: 8, accuracy: 0.95 } }), 0.95)).toBe(true)
  })

  it('returns true when extraction accuracy > threshold', () => {
    expect(meetsThreshold(makeReport({ extraction: { casesScored: 2, totalFields: 8, passedFields: 8, accuracy: 1.0 } }), 0.95)).toBe(true)
  })

  it('returns false when extraction accuracy < threshold', () => {
    expect(meetsThreshold(makeReport(), 0.95)).toBe(false)
  })
})
