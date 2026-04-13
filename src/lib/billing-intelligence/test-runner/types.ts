/**
 * A test case loaded from the DB, ready to run.
 * The bill PDF has been downloaded and converted to text.
 */
export interface LoadedTestCase {
  id: string
  testBillId: string
  profileId: string
  description: string | null
  billText: string
  expectedFields: Record<string, string | number>
  competencies: Competency[]
}

export type Competency = 'identification' | 'extraction' | 'validation'

/**
 * Result of comparing one field between extracted and expected values.
 */
export interface FieldComparison {
  field: string
  expected: string | number
  actual: string | number | undefined
  passed: boolean
}

/**
 * Result of running one test case through the pipeline.
 *
 * Identification is a gate: if it fails, extraction is not scored.
 * Fix identification first, then measure extraction accuracy.
 */
export interface TestCaseResult {
  testCaseId: string
  testBillId: string
  profileId: string
  description: string | null
  /** null when identification competency not tested */
  identificationPassed: boolean | null
  /** null when validation competency not tested */
  validationPassed: boolean | null
  /** Empty when identification failed — extraction not scored */
  fieldComparisons: FieldComparison[]
  totalFields: number
  passedFields: number
}

/**
 * Aggregated accuracy report for a test run (one provider or all).
 *
 * Identification and extraction are reported separately:
 * - identification: pass/fail gate — how many test cases identified the right provider?
 * - extraction: field-level accuracy — only computed for cases where identification passed
 */
export interface AccuracyReport {
  profileId: string | null
  totalCases: number
  identification: {
    tested: number
    passed: number
    failed: number
  }
  extraction: {
    /** Cases where identification passed (or was not tested) and extraction was scored */
    casesScored: number
    totalFields: number
    passedFields: number
    accuracy: number
  }
  validation: {
    tested: number
    passed: number
    failed: number
  }
  caseResults: TestCaseResult[]
  /** Per-field extraction accuracy across scored test cases */
  fieldAccuracy: Record<string, { total: number; passed: number; accuracy: number }>
}
