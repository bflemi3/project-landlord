import { describe, it, expect } from 'vitest'
import {
  computeFieldStatus,
  getSourceMethodScore,
  buildBillExtractionConfidence,
} from '../confidence'

describe('getSourceMethodScore', () => {
  it('scores API highest', () => {
    expect(getSourceMethodScore('api')).toBe(0.95)
  })

  it('scores DDA high', () => {
    expect(getSourceMethodScore('dda')).toBe(0.90)
  })

  it('scores PDF at 0.80', () => {
    expect(getSourceMethodScore('pdf')).toBe(0.80)
  })

  it('scores web-scrape at 0.70', () => {
    expect(getSourceMethodScore('web-scrape')).toBe(0.70)
  })

  it('scores email at 0.65', () => {
    expect(getSourceMethodScore('email')).toBe(0.65)
  })

  it('scores OCR lowest', () => {
    expect(getSourceMethodScore('ocr')).toBe(0.50)
  })

  it('defaults unknown source to 0.50', () => {
    expect(getSourceMethodScore('unknown' as any)).toBe(0.50)
  })
})

describe('computeFieldStatus', () => {
  it('confirmed: high extraction + validated', () => {
    expect(computeFieldStatus({ extraction: 0.95, validation: 1.0 }))
      .toBe('confirmed')
  })

  it('high: high extraction, no validation', () => {
    expect(computeFieldStatus({ extraction: 0.95 }))
      .toBe('high')
  })

  it('needs-review: medium extraction', () => {
    expect(computeFieldStatus({ extraction: 0.7 }))
      .toBe('needs-review')
  })

  it('needs-review: high extraction but validation discrepancy', () => {
    expect(computeFieldStatus({ extraction: 0.95, validation: 0.0 }))
      .toBe('needs-review')
  })

  it('needs-review: validated but extraction is medium', () => {
    expect(computeFieldStatus({ extraction: 0.7, validation: 1.0 }))
      .toBe('needs-review')
  })

  it('failed: low extraction', () => {
    expect(computeFieldStatus({ extraction: 0.3 }))
      .toBe('failed')
  })

  it('failed: field not found (extraction = 0)', () => {
    expect(computeFieldStatus({ extraction: 0 }))
      .toBe('failed')
  })

  // Boundary tests
  it('boundary: extraction exactly 0.9 is high (no validation)', () => {
    expect(computeFieldStatus({ extraction: 0.9 }))
      .toBe('high')
  })

  it('boundary: extraction exactly 0.5 is needs-review', () => {
    expect(computeFieldStatus({ extraction: 0.5 }))
      .toBe('needs-review')
  })

  it('boundary: extraction 0.49 is failed', () => {
    expect(computeFieldStatus({ extraction: 0.49 }))
      .toBe('failed')
  })

  it('boundary: validation exactly 0.9 + high extraction is confirmed', () => {
    expect(computeFieldStatus({ extraction: 0.9, validation: 0.9 }))
      .toBe('confirmed')
  })

  it('boundary: validation 0.5 + high extraction is high (not discrepancy)', () => {
    // validation >= 0.5 does not trigger discrepancy, but < 0.9 so not confirmed → high
    expect(computeFieldStatus({ extraction: 0.95, validation: 0.5 }))
      .toBe('high')
  })

  it('boundary: validation 0.49 forces needs-review regardless of extraction', () => {
    expect(computeFieldStatus({ extraction: 0.99, validation: 0.49 }))
      .toBe('needs-review')
  })

  it('validation undefined treated same as omitted', () => {
    expect(computeFieldStatus({ extraction: 0.95, validation: undefined }))
      .toBe('high')
  })

  it('medium extraction + medium validation is needs-review', () => {
    // extraction < 0.9 → needs-review regardless of validation
    expect(computeFieldStatus({ extraction: 0.7, validation: 0.7 }))
      .toBe('needs-review')
  })
})

describe('buildBillExtractionConfidence', () => {
  it('builds confidence with all fields found via PDF', () => {
    const result = buildBillExtractionConfidence({
      sourceMethod: 'pdf',
      fields: {
        amountDue: { found: true },
        dueDate: { found: true },
        accountNumber: { found: true },
      },
    })

    expect(result.source.method).toBe('pdf')
    expect(result.source.methodScore).toBe(0.80)
    expect(result.fields.amountDue.extraction).toBe(0.80)
    // PDF extraction=0.80 < 0.9 threshold → needs-review
    expect(result.fields.amountDue.status).toBe('needs-review')
    expect(result.summary.totalFields).toBe(3)
    expect(result.summary.needsReview).toBe(3)
    expect(result.summary.autoAcceptable).toBe(false)
  })

  it('builds confidence with missing fields', () => {
    const result = buildBillExtractionConfidence({
      sourceMethod: 'pdf',
      fields: {
        amountDue: { found: true },
        dueDate: { found: false },
      },
    })

    // PDF extraction=0.80 < 0.9 threshold → needs-review
    expect(result.fields.amountDue.status).toBe('needs-review')
    expect(result.fields.dueDate.extraction).toBe(0)
    expect(result.fields.dueDate.status).toBe('failed')
    expect(result.summary.failed).toBe(1)
    expect(result.summary.autoAcceptable).toBe(false)
  })

  it('builds confidence with validation results', () => {
    const result = buildBillExtractionConfidence({
      sourceMethod: 'pdf',
      fields: {
        amountDue: { found: true, validation: 1.0, validationSource: 'api' },
        dueDate: { found: true, validation: 0.0, validationSource: 'api' },
      },
    })

    expect(result.fields.amountDue.status).toBe('needs-review')
    expect(result.fields.amountDue.validationSource).toBe('api')
    expect(result.fields.dueDate.status).toBe('needs-review')
    expect(result.summary.needsReview).toBe(2)
    expect(result.summary.autoAcceptable).toBe(false)
  })

  it('API source produces higher extraction confidence', () => {
    const result = buildBillExtractionConfidence({
      sourceMethod: 'api',
      fields: {
        amountDue: { found: true },
      },
    })

    expect(result.fields.amountDue.extraction).toBe(0.95)
    expect(result.fields.amountDue.status).toBe('high')
  })

  it('OCR source produces lower extraction confidence', () => {
    const result = buildBillExtractionConfidence({
      sourceMethod: 'ocr',
      fields: {
        amountDue: { found: true },
      },
    })

    expect(result.fields.amountDue.extraction).toBe(0.50)
    expect(result.fields.amountDue.status).toBe('needs-review')
  })

  it('handles empty fields input', () => {
    const result = buildBillExtractionConfidence({
      sourceMethod: 'pdf',
      fields: {},
    })

    expect(result.summary.totalFields).toBe(0)
    expect(result.summary.autoAcceptable).toBe(true)
  })

  it('handles all fields missing', () => {
    const result = buildBillExtractionConfidence({
      sourceMethod: 'pdf',
      fields: {
        amountDue: { found: false },
        dueDate: { found: false },
        accountNumber: { found: false },
      },
    })

    expect(result.summary.totalFields).toBe(3)
    expect(result.summary.failed).toBe(3)
    expect(result.summary.autoAcceptable).toBe(false)
  })

  it('PDF source: all found fields are needs-review (0.80 < 0.9 threshold)', () => {
    const result = buildBillExtractionConfidence({
      sourceMethod: 'pdf',
      fields: {
        amountDue: { found: true, validation: 1.0, validationSource: 'api' },  // extraction=0.80 < 0.9 → needs-review despite validation
        accountNumber: { found: true },                                          // extraction=0.80 < 0.9 → needs-review
        referenceMonth: { found: false },                                        // extraction=0 → failed
      },
    })

    expect(result.fields.amountDue.status).toBe('needs-review')
    expect(result.fields.accountNumber.status).toBe('needs-review')
    expect(result.fields.referenceMonth.status).toBe('failed')
    expect(result.summary.needsReview).toBe(2)
    expect(result.summary.failed).toBe(1)
    expect(result.summary.autoAcceptable).toBe(false)
  })

  it('API source with validation achieves confirmed status', () => {
    const result = buildBillExtractionConfidence({
      sourceMethod: 'api',
      fields: {
        amountDue: { found: true, validation: 1.0, validationSource: 'web' },
      },
    })

    // API extraction=0.95 >= 0.9, validation=1.0 >= 0.9 → confirmed
    expect(result.fields.amountDue.status).toBe('confirmed')
    expect(result.summary.confirmed).toBe(1)
    expect(result.summary.autoAcceptable).toBe(true)
  })

  it('validation without validationSource omits the field', () => {
    const result = buildBillExtractionConfidence({
      sourceMethod: 'api',
      fields: {
        amountDue: { found: true, validation: 1.0 },
      },
    })

    expect(result.fields.amountDue.validation).toBe(1.0)
    expect(result.fields.amountDue.validationSource).toBeUndefined()
  })

  it('field with found=false ignores validation', () => {
    const result = buildBillExtractionConfidence({
      sourceMethod: 'pdf',
      fields: {
        amountDue: { found: false, validation: 1.0, validationSource: 'api' },
      },
    })

    // extraction=0 → failed, regardless of validation
    expect(result.fields.amountDue.extraction).toBe(0)
    expect(result.fields.amountDue.status).toBe('failed')
  })

  it('autoAcceptable true when all fields confirmed', () => {
    const result = buildBillExtractionConfidence({
      sourceMethod: 'api',
      fields: {
        amountDue: { found: true, validation: 1.0, validationSource: 'web' },
        dueDate: { found: true, validation: 0.95, validationSource: 'web' },
      },
    })

    expect(result.summary.confirmed).toBe(2)
    expect(result.summary.autoAcceptable).toBe(true)
  })

  it('DDA source method', () => {
    const result = buildBillExtractionConfidence({
      sourceMethod: 'dda',
      fields: { amountDue: { found: true } },
    })

    expect(result.source.method).toBe('dda')
    expect(result.source.methodScore).toBe(0.90)
    expect(result.fields.amountDue.extraction).toBe(0.90)
    expect(result.fields.amountDue.status).toBe('high')
  })

  it('web-scrape source method', () => {
    const result = buildBillExtractionConfidence({
      sourceMethod: 'web-scrape',
      fields: { amountDue: { found: true } },
    })

    expect(result.source.methodScore).toBe(0.70)
    expect(result.fields.amountDue.status).toBe('needs-review')
  })

  it('email source method', () => {
    const result = buildBillExtractionConfidence({
      sourceMethod: 'email',
      fields: { amountDue: { found: true } },
    })

    expect(result.source.methodScore).toBe(0.65)
    expect(result.fields.amountDue.status).toBe('needs-review')
  })
})
