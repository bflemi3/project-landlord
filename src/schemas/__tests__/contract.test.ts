import { describe, it, expect } from 'vitest'
import { z } from 'zod'

import { CONTRACT_EXTRACTION_SCHEMA_VERSION } from '@/lib/contract-extraction/types'

import { CONTRACT_MIME_TYPES, contractInputSchema } from '../contract'

const PDF = 'application/pdf' as const
const DOCX =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document' as const

function valid(overrides: Record<string, unknown> = {}) {
  return {
    mime_type: PDF,
    bytes: 1_000_000,
    original_filename: 'lease.pdf',
    extension: 'pdf',
    ...overrides,
  }
}

function fieldErrors(input: unknown) {
  const r = contractInputSchema.safeParse(input)
  if (r.success) return null
  return z.flattenError(r.error).fieldErrors
}

function pathMessages(
  r: ReturnType<typeof contractInputSchema.safeParse>,
  path: (string | number)[],
): string[] {
  if (r.success) return []
  return r.error.issues
    .filter((i) => i.path.length === path.length && i.path.every((p, idx) => p === path[idx]))
    .map((i) => i.message)
}

function validExtraction(overrides: Record<string, unknown> = {}) {
  return {
    extraction_data: { isRentalContract: true },
    extraction_language: 'pt-br',
    extraction_model: 'claude-sonnet-4-6',
    extraction_schema_version: CONTRACT_EXTRACTION_SCHEMA_VERSION,
    raw_text: 'Contrato de locação...',
    extracted_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

// =============================================================================
// CONTRACT_MIME_TYPES — allowlist matches what extract-text.ts actually supports
// =============================================================================

describe('CONTRACT_MIME_TYPES', () => {
  it('contains application/pdf', () => {
    expect(CONTRACT_MIME_TYPES).toContain(PDF)
  })

  it('contains the DOCX OOXML mime', () => {
    expect(CONTRACT_MIME_TYPES).toContain(DOCX)
  })

  it('does not include image types (extract-text.ts has no OCR path)', () => {
    expect(CONTRACT_MIME_TYPES).not.toContain('image/jpeg' as never)
    expect(CONTRACT_MIME_TYPES).not.toContain('image/png' as never)
    expect(CONTRACT_MIME_TYPES).not.toContain('image/webp' as never)
  })

  it('does not include the legacy application/msword (.doc) mime', () => {
    expect(CONTRACT_MIME_TYPES).not.toContain('application/msword' as never)
  })
})

// =============================================================================
// contractInputSchema — happy path
// =============================================================================

describe('contractInputSchema — happy paths', () => {
  it('accepts a minimal PDF without extraction', () => {
    const r = contractInputSchema.safeParse(valid())
    expect(r.success).toBe(true)
  })

  it('accepts a DOCX with the OOXML mime', () => {
    const r = contractInputSchema.safeParse(
      valid({ mime_type: DOCX, extension: 'docx', original_filename: 'lease.docx' }),
    )
    expect(r.success).toBe(true)
  })

  it('defaults extraction to null when omitted', () => {
    const r = contractInputSchema.parse(valid())
    expect(r.extraction).toBeNull()
  })

  it('accepts a contract with a valid extraction payload', () => {
    const r = contractInputSchema.safeParse(
      valid({ extraction: validExtraction() }),
    )
    expect(r.success).toBe(true)
  })

  it('lowercases the extension before regex-matching', () => {
    const r = contractInputSchema.parse(valid({ extension: 'PDF' }))
    expect(r.extension).toBe('pdf')
  })
})

// =============================================================================
// Mime-type rejection
// =============================================================================

describe('contractInputSchema — mime_type allowlist', () => {
  it('rejects image/jpeg with "invalidMimeType"', () => {
    const errors = fieldErrors(valid({ mime_type: 'image/jpeg' }))
    expect(errors?.mime_type).toEqual(['invalidMimeType'])
  })

  it('rejects image/png with "invalidMimeType"', () => {
    const errors = fieldErrors(valid({ mime_type: 'image/png' }))
    expect(errors?.mime_type).toEqual(['invalidMimeType'])
  })

  it('rejects application/msword with "invalidMimeType"', () => {
    const errors = fieldErrors(valid({ mime_type: 'application/msword' }))
    expect(errors?.mime_type).toEqual(['invalidMimeType'])
  })

  it('rejects text/plain with "invalidMimeType"', () => {
    const errors = fieldErrors(valid({ mime_type: 'text/plain' }))
    expect(errors?.mime_type).toEqual(['invalidMimeType'])
  })
})

// =============================================================================
// Extension regex
// =============================================================================

describe('contractInputSchema — extension regex', () => {
  it('accepts "pdf"', () => {
    expect(contractInputSchema.safeParse(valid({ extension: 'pdf' })).success).toBe(true)
  })

  it('accepts "docx"', () => {
    expect(
      contractInputSchema.safeParse(
        valid({ extension: 'docx', mime_type: DOCX, original_filename: 'lease.docx' }),
      ).success,
    ).toBe(true)
  })

  it('accepts mixed-case input (lowercased before match)', () => {
    expect(contractInputSchema.safeParse(valid({ extension: 'PDF' })).success).toBe(true)
  })

  it('rejects an empty extension with "invalidExtension"', () => {
    const errors = fieldErrors(valid({ extension: '' }))
    expect(errors?.extension).toEqual(['invalidExtension'])
  })

  it('rejects an extension with a leading dot', () => {
    const errors = fieldErrors(valid({ extension: '.pdf' }))
    expect(errors?.extension).toEqual(['invalidExtension'])
  })

  it('rejects an extension with a path separator', () => {
    const errors = fieldErrors(valid({ extension: 'a/b' }))
    expect(errors?.extension).toEqual(['invalidExtension'])
  })

  it('rejects an extension with non-alphanumeric characters', () => {
    const errors = fieldErrors(valid({ extension: 'pdf!' }))
    expect(errors?.extension).toEqual(['invalidExtension'])
  })

  it('rejects an extension longer than 8 chars', () => {
    const errors = fieldErrors(valid({ extension: 'abcdefghi' }))
    expect(errors?.extension).toEqual(['invalidExtension'])
  })
})

// =============================================================================
// bytes — MAX_CONTRACT_BYTES (25 MB)
// =============================================================================

describe('contractInputSchema — bytes', () => {
  it('accepts bytes at the cap (25 MB)', () => {
    const r = contractInputSchema.safeParse(valid({ bytes: 26_214_400 }))
    expect(r.success).toBe(true)
  })

  it('rejects bytes over the cap with "fileTooLarge"', () => {
    const errors = fieldErrors(valid({ bytes: 26_214_401 }))
    expect(errors?.bytes).toEqual(['fileTooLarge'])
  })

  it('rejects zero with "invalidBytes"', () => {
    const errors = fieldErrors(valid({ bytes: 0 }))
    expect(errors?.bytes).toEqual(['invalidBytes'])
  })

  it('rejects a negative value with "invalidBytes"', () => {
    const errors = fieldErrors(valid({ bytes: -1 }))
    expect(errors?.bytes).toEqual(['invalidBytes'])
  })

  it('rejects a float with "invalidBytes"', () => {
    const errors = fieldErrors(valid({ bytes: 1.5 }))
    expect(errors?.bytes).toEqual(['invalidBytes'])
  })
})

// =============================================================================
// original_filename
// =============================================================================

describe('contractInputSchema — original_filename', () => {
  it('rejects empty with "required"', () => {
    const errors = fieldErrors(valid({ original_filename: '' }))
    expect(errors?.original_filename).toEqual(['required'])
  })

  it('rejects whitespace-only with "required" (after trim)', () => {
    const errors = fieldErrors(valid({ original_filename: '   ' }))
    expect(errors?.original_filename).toEqual(['required'])
  })

  it('rejects a filename longer than 255 chars with "tooLong"', () => {
    const errors = fieldErrors(valid({ original_filename: `${'a'.repeat(256)}.pdf` }))
    expect(errors?.original_filename).toEqual(['tooLong'])
  })
})

// =============================================================================
// extraction.schema_version mismatch
// =============================================================================

describe('contractInputSchema — extraction schema version', () => {
  it('accepts a matching schema version', () => {
    const r = contractInputSchema.safeParse(
      valid({
        extraction: validExtraction({
          extraction_schema_version: CONTRACT_EXTRACTION_SCHEMA_VERSION,
        }),
      }),
    )
    expect(r.success).toBe(true)
  })

  it('rejects a stale schema version with "extractionSchemaVersionMismatch"', () => {
    const r = contractInputSchema.safeParse(
      valid({
        extraction: validExtraction({
          extraction_schema_version: CONTRACT_EXTRACTION_SCHEMA_VERSION + 1,
        }),
      }),
    )
    expect(r.success).toBe(false)
    expect(pathMessages(r, ['extraction', 'extraction_schema_version'])).toContain(
      'extractionSchemaVersionMismatch',
    )
  })

  it('rejects schema_version = 0 with "invalidSchemaVersion" (sentinel is for DB only)', () => {
    const r = contractInputSchema.safeParse(
      valid({ extraction: validExtraction({ extraction_schema_version: 0 }) }),
    )
    expect(r.success).toBe(false)
    expect(
      pathMessages(r, ['extraction', 'extraction_schema_version']),
    ).toContain('invalidSchemaVersion')
  })

  it('rejects a non-integer schema_version with "invalidSchemaVersion"', () => {
    const r = contractInputSchema.safeParse(
      valid({ extraction: validExtraction({ extraction_schema_version: 1.5 }) }),
    )
    expect(r.success).toBe(false)
  })
})

// =============================================================================
// extraction — required inner fields
// =============================================================================

describe('contractInputSchema — extraction inner fields', () => {
  it('rejects missing extraction_language with "required"', () => {
    const r = contractInputSchema.safeParse(
      valid({ extraction: validExtraction({ extraction_language: '' }) }),
    )
    expect(r.success).toBe(false)
    expect(pathMessages(r, ['extraction', 'extraction_language'])).toContain('required')
  })

  it('rejects missing extraction_model with "required"', () => {
    const r = contractInputSchema.safeParse(
      valid({ extraction: validExtraction({ extraction_model: '' }) }),
    )
    expect(r.success).toBe(false)
    expect(pathMessages(r, ['extraction', 'extraction_model'])).toContain('required')
  })

  it('rejects missing extracted_at with "required"', () => {
    const r = contractInputSchema.safeParse(
      valid({ extraction: validExtraction({ extracted_at: '' }) }),
    )
    expect(r.success).toBe(false)
    expect(pathMessages(r, ['extraction', 'extracted_at'])).toContain('required')
  })
})
