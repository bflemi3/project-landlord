import type { BillExtractionResult } from '../types'
import type { FieldComparison } from './types'

/**
 * Resolve a dot-notation path against an BillExtractionResult.
 * e.g., "billing.amountDue" → extraction.billing.amountDue
 */
export function resolveField(
  extraction: BillExtractionResult,
  path: string,
): string | number | undefined {
  const parts = path.split('.')
  let current: unknown = extraction

  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined
    }
    current = (current as Record<string, unknown>)[part]
  }

  if (typeof current === 'string' || typeof current === 'number') {
    return current
  }
  return undefined
}

/**
 * Compare a single field from an extraction against an expected value.
 * Handles string/number coercion: if expected is a string representation
 * of a number and actual is a number (or vice versa), compare as strings.
 */
export function compareField(
  extraction: BillExtractionResult,
  path: string,
  expected: string | number,
): FieldComparison {
  const actual = resolveField(extraction, path)

  let passed = actual === expected
  if (!passed && actual !== undefined) {
    // Coerce: compare string representations
    passed = String(actual) === String(expected)
  }

  return { field: path, expected, actual, passed }
}

/**
 * Compare all expected fields against an extraction result.
 */
export function compareAllFields(
  extraction: BillExtractionResult,
  expectedFields: Record<string, string | number>,
): FieldComparison[] {
  return Object.entries(expectedFields).map(([path, expected]) =>
    compareField(extraction, path, expected),
  )
}
