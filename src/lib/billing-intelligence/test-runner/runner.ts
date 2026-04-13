import type { ExtractionResult } from '../types'
import type {
  LoadedTestCase,
  TestCaseResult,
  AccuracyReport,
} from './types'
import { compareAllFields } from './compare'

export interface RunTestCaseInput {
  testCase: LoadedTestCase
  extraction: ExtractionResult | null
  identificationPassed: boolean | null
  validationPassed: boolean | null
}

/**
 * Run a single test case against an extraction result.
 *
 * Identification is a gate: if it fails, extraction is not scored.
 * The caller runs the pipeline (identify + extract + validate) and
 * passes results here. This keeps the runner pure.
 */
export function runTestCase(input: RunTestCaseInput): TestCaseResult {
  const { testCase, extraction, identificationPassed, validationPassed } = input

  // If identification was tested and failed, skip extraction scoring
  const identificationFailed = identificationPassed === false
  const shouldScoreExtraction = !identificationFailed && extraction !== null

  const fieldComparisons = shouldScoreExtraction
    ? compareAllFields(extraction, testCase.expectedFields)
    : []
  const passedFields = fieldComparisons.filter((f) => f.passed).length

  return {
    testCaseId: testCase.id,
    testBillId: testCase.testBillId,
    profileId: testCase.profileId,
    description: testCase.description,
    identificationPassed,
    validationPassed,
    fieldComparisons,
    totalFields: fieldComparisons.length,
    passedFields,
  }
}

/**
 * Aggregate test case results into an accuracy report.
 *
 * Identification and extraction are reported separately:
 * - identification: pass/fail counts
 * - extraction: field-level accuracy, only from cases where identification passed
 * - validation: pass/fail counts
 */
export function buildAccuracyReport(
  profileId: string | null,
  caseResults: TestCaseResult[],
): AccuracyReport {
  // Identification stats
  const idTested = caseResults.filter((r) => r.identificationPassed !== null)
  const identification = {
    tested: idTested.length,
    passed: idTested.filter((r) => r.identificationPassed === true).length,
    failed: idTested.filter((r) => r.identificationPassed === false).length,
  }

  // Validation stats
  const valTested = caseResults.filter((r) => r.validationPassed !== null)
  const validation = {
    tested: valTested.length,
    passed: valTested.filter((r) => r.validationPassed === true).length,
    failed: valTested.filter((r) => r.validationPassed === false).length,
  }

  // Extraction accuracy — only from scored cases (identification didn't fail)
  const scoredCases = caseResults.filter((r) => r.fieldComparisons.length > 0)
  const totalFields = scoredCases.reduce((sum, r) => sum + r.totalFields, 0)
  const passedFields = scoredCases.reduce((sum, r) => sum + r.passedFields, 0)

  // Per-field accuracy across scored cases
  const fieldStats: Record<string, { total: number; passed: number }> = {}
  for (const caseResult of scoredCases) {
    for (const fc of caseResult.fieldComparisons) {
      if (!fieldStats[fc.field]) fieldStats[fc.field] = { total: 0, passed: 0 }
      fieldStats[fc.field].total++
      if (fc.passed) fieldStats[fc.field].passed++
    }
  }

  const fieldAccuracy: AccuracyReport['fieldAccuracy'] = {}
  for (const [field, stats] of Object.entries(fieldStats)) {
    fieldAccuracy[field] = {
      ...stats,
      accuracy: stats.total > 0 ? stats.passed / stats.total : 0,
    }
  }

  return {
    profileId,
    totalCases: caseResults.length,
    identification,
    extraction: {
      casesScored: scoredCases.length,
      totalFields,
      passedFields,
      accuracy: totalFields > 0 ? passedFields / totalFields : 0,
    },
    validation,
    caseResults,
    fieldAccuracy,
  }
}
