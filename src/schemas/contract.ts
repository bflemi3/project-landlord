import { z } from 'zod'

import { CONTRACT_EXTRACTION_SCHEMA_VERSION } from '@/lib/contract-extraction/types'

// Mime types `extract-text.ts` actually supports — PDF via unpdf and DOCX via
// mammoth. No image OCR path exists yet. The contracts Storage bucket's own
// allowed_mime_types list is wider (includes images) and disagrees with this
// — flag for a follow-up bucket-tightening migration.
export const CONTRACT_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const

export type ContractMimeType = (typeof CONTRACT_MIME_TYPES)[number]

// Bucket cap is 25 MB.
const MAX_CONTRACT_BYTES = 26_214_400

// File extension recorded on the storage path (`{unit_id}/{contract_id}.<ext>`).
const EXTENSION_RE = /^[a-z0-9]{1,8}$/

export const contractInputSchema = z
  .object({
    mime_type: z.enum(CONTRACT_MIME_TYPES, { error: 'invalidMimeType' }),
    bytes: z
      .number({ error: 'required' })
      .int({ error: 'invalidBytes' })
      .positive({ error: 'invalidBytes' })
      .max(MAX_CONTRACT_BYTES, { error: 'fileTooLarge' }),
    original_filename: z
      .string()
      .trim()
      .min(1, { error: 'required' })
      .max(255, { error: 'tooLong' }),
    extension: z
      .string()
      .toLowerCase()
      .regex(EXTENSION_RE, { error: 'invalidExtension' }),
    // `extraction` is nullable because extraction may have failed (timeout,
    // unsupported format) — the wizard still proceeds and the contract row
    // lands with `extraction_schema_version = 0`. When present, the persisted
    // `extraction_data` JSONB is the canonical LLM-output blob; we don't
    // re-validate its inner shape here to avoid a circular dep with the
    // extraction module — `schema_version` is the drift guard.
    extraction: z
      .object({
        extraction_data: z.unknown(),
        extraction_language: z.string().min(1, { error: 'required' }).max(16, { error: 'tooLong' }),
        extraction_model: z.string().min(1, { error: 'required' }).max(128, { error: 'tooLong' }),
        extraction_schema_version: z
          .number()
          .int({ error: 'invalidSchemaVersion' })
          .min(1, { error: 'invalidSchemaVersion' }),
        raw_text: z.string(),
        extracted_at: z.string().min(1, { error: 'required' }),
      })
      .nullable()
      .default(null),
  })
  .superRefine((contract, ctx) => {
    if (
      contract.extraction != null &&
      contract.extraction.extraction_schema_version !==
        CONTRACT_EXTRACTION_SCHEMA_VERSION
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['extraction', 'extraction_schema_version'],
        message: 'extractionSchemaVersionMismatch',
      })
    }
  })

export type ContractInput = z.infer<typeof contractInputSchema>
