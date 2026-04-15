import { describe, it, expect } from 'vitest'
import { runTestCase, buildAccuracyReport } from '../runner'
import type { LoadedTestCase, TestCaseResult } from '../types'
import type { ExtractionResult } from '../../types'
import { buildExtractionConfidence } from '../../confidence'

const makeExtraction = (overrides: Partial<ExtractionResult['billing']> = {}): ExtractionResult => ({
  provider: {
    profileId: 'test-profile',
    companyName: 'Test Co',
    taxId: '12345678000199',
    category: 'electricity',
  },
  customer: {
    name: 'João Silva',
    taxId: '12345678901',
    taxIdType: 'cpf',
    countryCode: 'BR',
    accountNumber: '999888',
  },
  billing: {
    referenceMonth: '2026-03',
    dueDate: '2026-04-15',
    amountDue: 15000,
    currency: 'BRL',
    ...overrides,
  },
  payment: {},
  confidence: buildExtractionConfidence({
    sourceMethod: 'pdf',
    fields: { amountDue: { found: true } },
  }),
  rawSource: 'pdf',
})

const sampleTestCase: LoadedTestCase = {
  id: 'tc-1',
  testBillId: 'bill-1',
  profileId: 'test-profile',
  description: 'March 2026 bill',
  billText: 'irrelevant for this test — pipeline is mocked',
  expectedFields: {
    'provider.taxId': '12345678000199',
    'customer.name': 'João Silva',
    'billing.amountDue': 15000,
    'billing.dueDate': '2026-04-15',
  },
  competencies: ['extraction'],
}

describe('runTestCase', () => {
  it('scores all fields as passed when extraction matches', () => {
    const result = runTestCase({
      testCase: sampleTestCase,
      extraction: makeExtraction(),
      identificationPassed: null,
      validationPassed: null,
    })
    expect(result.passedFields).toBe(4)
    expect(result.totalFields).toBe(4)
    expect(result.fieldComparisons).toHaveLength(4)
  })

  it('scores failed fields when extraction differs', () => {
    const result = runTestCase({
      testCase: sampleTestCase,
      extraction: makeExtraction({ amountDue: 99999 }),
      identificationPassed: null,
      validationPassed: null,
    })
    expect(result.passedFields).toBe(3)
    expect(result.totalFields).toBe(4)
    expect(result.fieldComparisons.find((f) => f.field === 'billing.amountDue')?.passed).toBe(false)
  })

  it('skips extraction scoring when identification fails', () => {
    const result = runTestCase({
      testCase: { ...sampleTestCase, competencies: ['identification', 'extraction'] },
      extraction: makeExtraction(),
      identificationPassed: false,
      validationPassed: null,
    })
    expect(result.identificationPassed).toBe(false)
    expect(result.fieldComparisons).toHaveLength(0)
    expect(result.totalFields).toBe(0)
    expect(result.passedFields).toBe(0)
  })

  it('skips extraction scoring when identification fails and extraction is null', () => {
    const result = runTestCase({
      testCase: { ...sampleTestCase, competencies: ['identification', 'extraction'] },
      extraction: null,
      identificationPassed: false,
      validationPassed: null,
    })
    expect(result.identificationPassed).toBe(false)
    expect(result.fieldComparisons).toHaveLength(0)
    expect(result.totalFields).toBe(0)
    expect(result.passedFields).toBe(0)
  })

  it('scores extraction when identification passes', () => {
    const result = runTestCase({
      testCase: { ...sampleTestCase, competencies: ['identification', 'extraction'] },
      extraction: makeExtraction(),
      identificationPassed: true,
      validationPassed: null,
    })
    expect(result.identificationPassed).toBe(true)
    expect(result.passedFields).toBe(4)
  })

  it('sets identificationPassed to null when not tested', () => {
    const result = runTestCase({
      testCase: sampleTestCase,
      extraction: makeExtraction(),
      identificationPassed: null,
      validationPassed: null,
    })
    expect(result.identificationPassed).toBeNull()
  })

  it('records validationPassed true', () => {
    const result = runTestCase({
      testCase: { ...sampleTestCase, competencies: ['extraction', 'validation'] },
      extraction: makeExtraction(),
      identificationPassed: null,
      validationPassed: true,
    })
    expect(result.validationPassed).toBe(true)
  })

  it('records validationPassed false', () => {
    const result = runTestCase({
      testCase: { ...sampleTestCase, competencies: ['extraction', 'validation'] },
      extraction: makeExtraction(),
      identificationPassed: null,
      validationPassed: false,
    })
    expect(result.validationPassed).toBe(false)
  })

  it('returns zero fields when extraction is null', () => {
    const result = runTestCase({
      testCase: sampleTestCase,
      extraction: null,
      identificationPassed: null,
      validationPassed: null,
    })
    expect(result.totalFields).toBe(0)
    expect(result.fieldComparisons).toHaveLength(0)
  })

  it('handles all three competencies together', () => {
    const result = runTestCase({
      testCase: { ...sampleTestCase, competencies: ['identification', 'extraction', 'validation'] },
      extraction: makeExtraction(),
      identificationPassed: true,
      validationPassed: true,
    })
    expect(result.identificationPassed).toBe(true)
    expect(result.validationPassed).toBe(true)
    expect(result.passedFields).toBe(4)
    expect(result.totalFields).toBe(4)
  })

  it('preserves testBillId, profileId, and description in result', () => {
    const result = runTestCase({
      testCase: sampleTestCase,
      extraction: makeExtraction(),
      identificationPassed: null,
      validationPassed: null,
    })
    expect(result.testBillId).toBe('bill-1')
    expect(result.profileId).toBe('test-profile')
    expect(result.description).toBe('March 2026 bill')
  })
})

describe('buildAccuracyReport', () => {
  const makeResult = (overrides: Partial<TestCaseResult> = {}): TestCaseResult => ({
    testCaseId: 'tc-1',
    testBillId: 'bill-1',
    profileId: 'test-profile',
    description: 'Bill 1',
    identificationPassed: null,
    validationPassed: null,
    fieldComparisons: [
      { field: 'billing.amountDue', expected: 100, actual: 100, passed: true },
      { field: 'billing.dueDate', expected: '2026-04-15', actual: '2026-04-15', passed: true },
    ],
    totalFields: 2,
    passedFields: 2,
    ...overrides,
  })

  it('returns zero-state report for empty results', () => {
    const report = buildAccuracyReport('test-profile', [])
    expect(report.profileId).toBe('test-profile')
    expect(report.totalCases).toBe(0)
    expect(report.identification.tested).toBe(0)
    expect(report.extraction.casesScored).toBe(0)
    expect(report.extraction.totalFields).toBe(0)
    expect(report.extraction.accuracy).toBe(0)
    expect(report.validation.tested).toBe(0)
    expect(report.fieldAccuracy).toEqual({})
  })

  it('propagates profileId to report', () => {
    const report = buildAccuracyReport('my-profile', [makeResult()])
    expect(report.profileId).toBe('my-profile')
  })

  it('propagates null profileId for full suite runs', () => {
    const report = buildAccuracyReport(null, [makeResult()])
    expect(report.profileId).toBeNull()
  })

  it('aggregates extraction accuracy from scored cases only', () => {
    const results: TestCaseResult[] = [
      makeResult({ passedFields: 2 }),
      makeResult({
        testCaseId: 'tc-2',
        testBillId: 'bill-2',
        fieldComparisons: [
          { field: 'billing.amountDue', expected: 200, actual: 200, passed: true },
          { field: 'billing.dueDate', expected: '2026-05-15', actual: '2026-05-20', passed: false },
        ],
        passedFields: 1,
      }),
    ]
    const report = buildAccuracyReport('test-profile', results)
    expect(report.totalCases).toBe(2)
    expect(report.extraction.casesScored).toBe(2)
    expect(report.extraction.totalFields).toBe(4)
    expect(report.extraction.passedFields).toBe(3)
    expect(report.extraction.accuracy).toBeCloseTo(0.75)
    expect(report.fieldAccuracy['billing.amountDue'].accuracy).toBe(1)
    expect(report.fieldAccuracy['billing.dueDate'].accuracy).toBe(0.5)
  })

  it('separates identification stats', () => {
    const results: TestCaseResult[] = [
      makeResult({ identificationPassed: true }),
      makeResult({ testCaseId: 'tc-2', testBillId: 'bill-2', identificationPassed: true }),
      makeResult({
        testCaseId: 'tc-3',
        testBillId: 'bill-3',
        identificationPassed: false,
        fieldComparisons: [],
        totalFields: 0,
        passedFields: 0,
      }),
    ]
    const report = buildAccuracyReport('test-profile', results)
    expect(report.identification.tested).toBe(3)
    expect(report.identification.passed).toBe(2)
    expect(report.identification.failed).toBe(1)
    // Only 2 cases scored for extraction (identification failed case excluded)
    expect(report.extraction.casesScored).toBe(2)
  })

  it('reports identification.tested as 0 when no cases test identification', () => {
    const results: TestCaseResult[] = [
      makeResult({ identificationPassed: null }),
      makeResult({ testCaseId: 'tc-2', testBillId: 'bill-2', identificationPassed: null }),
    ]
    const report = buildAccuracyReport('p', results)
    expect(report.identification.tested).toBe(0)
    expect(report.identification.passed).toBe(0)
    expect(report.identification.failed).toBe(0)
  })

  it('excludes identification-failed cases from extraction accuracy', () => {
    const results: TestCaseResult[] = [
      makeResult({
        identificationPassed: false,
        fieldComparisons: [],
        totalFields: 0,
        passedFields: 0,
      }),
    ]
    const report = buildAccuracyReport('p', results)
    expect(report.extraction.casesScored).toBe(0)
    expect(report.extraction.totalFields).toBe(0)
    expect(report.extraction.accuracy).toBe(0)
    expect(report.fieldAccuracy).toEqual({})
  })

  it('handles mixed competencies across cases', () => {
    const results: TestCaseResult[] = [
      // Case 1: tests identification + extraction
      makeResult({ identificationPassed: true }),
      // Case 2: tests extraction only (older test case)
      makeResult({
        testCaseId: 'tc-2',
        testBillId: 'bill-2',
        identificationPassed: null,
      }),
    ]
    const report = buildAccuracyReport('p', results)
    // Only case 1 tested identification
    expect(report.identification.tested).toBe(1)
    expect(report.identification.passed).toBe(1)
    // Both cases scored for extraction
    expect(report.extraction.casesScored).toBe(2)
    expect(report.extraction.totalFields).toBe(4)
  })

  it('tracks validation stats', () => {
    const results: TestCaseResult[] = [
      makeResult({ validationPassed: true }),
      makeResult({ testCaseId: 'tc-2', testBillId: 'bill-2', validationPassed: false }),
      makeResult({ testCaseId: 'tc-3', testBillId: 'bill-3', validationPassed: null }),
    ]
    const report = buildAccuracyReport('p', results)
    expect(report.validation.tested).toBe(2)
    expect(report.validation.passed).toBe(1)
    expect(report.validation.failed).toBe(1)
  })
})
