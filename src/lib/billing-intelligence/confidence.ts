import type {
  ExtractionConfidence,
  ExtractionSource,
  FieldConfidence,
  FieldStatus,
} from './types'

/**
 * Base reliability scores by source method.
 * These are initial values subject to calibration as we collect real accuracy data.
 * When a field is found, its extraction confidence is set to the source method score.
 * When a field is not found, its extraction confidence is 0.
 */
const SOURCE_METHOD_SCORES: Record<ExtractionSource, number> = {
  api: 0.95,
  dda: 0.90,
  pdf: 0.80,
  'web-scrape': 0.70,
  email: 0.65,
  ocr: 0.50,
}

/** Get the base reliability score for a source method. */
export function getSourceMethodScore(method: ExtractionSource): number {
  return SOURCE_METHOD_SCORES[method] ?? 0.50
}

/**
 * Compute the routing status for a single field based on its
 * extraction and validation confidence.
 *
 * Extraction confidence: "did we read it correctly?" (0-1)
 * Validation confidence: "does it match another source?" (0-1, optional)
 *
 * Status routing:
 * - confirmed:    extraction >= 0.9 AND validated >= 0.9
 * - high:         extraction >= 0.9, no validation or not yet validated
 * - needs-review: extraction 0.5-0.9, or validation found discrepancy
 * - failed:       extraction < 0.5 or field not found
 */
export function computeFieldStatus(input: {
  extraction: number
  validation?: number
}): FieldStatus {
  const { extraction, validation } = input

  // Validation discrepancy always forces review
  if (validation !== undefined && validation < 0.5) return 'needs-review'

  // Validated and extraction is good
  if (validation !== undefined && validation >= 0.9 && extraction >= 0.9) return 'confirmed'

  // Good extraction, no validation (or validation not yet run)
  if (extraction >= 0.9) return 'high'

  // Medium extraction
  if (extraction >= 0.5) return 'needs-review'

  // Low extraction or not found
  return 'failed'
}

interface FieldInput {
  found: boolean
  validation?: number
  validationSource?: string
}

interface ConfidenceInput {
  sourceMethod: ExtractionSource
  fields: Record<string, FieldInput>
}

/**
 * Build the full ExtractionConfidence object for an extraction result.
 * Called by providers after parsing to produce a uniform confidence structure.
 *
 * Each field's extraction confidence = source method score if found, 0 if not.
 * Validation is an independent dimension set per field if a second source is available.
 * Status routing is computed per field from both dimensions.
 */
export function buildExtractionConfidence(
  input: ConfidenceInput,
): ExtractionConfidence {
  const methodScore = getSourceMethodScore(input.sourceMethod)

  const fields: Record<string, FieldConfidence> = {}
  let confirmed = 0
  let high = 0
  let needsReview = 0
  let failed = 0

  for (const [name, field] of Object.entries(input.fields)) {
    const extraction = field.found ? methodScore : 0
    const status = computeFieldStatus({
      extraction,
      validation: field.validation,
    })

    fields[name] = {
      extraction,
      status,
      ...(field.validation !== undefined && { validation: field.validation }),
      ...(field.validationSource && { validationSource: field.validationSource }),
    }

    switch (status) {
      case 'confirmed': confirmed++; break
      case 'high': high++; break
      case 'needs-review': needsReview++; break
      case 'failed': failed++; break
    }
  }

  const totalFields = Object.keys(fields).length

  return {
    fields,
    source: {
      method: input.sourceMethod,
      methodScore,
    },
    summary: {
      totalFields,
      confirmed,
      high,
      needsReview,
      failed,
      autoAcceptable: needsReview === 0 && failed === 0,
    },
  }
}
