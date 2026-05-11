import { z } from 'zod'

import { CONTRACT_EXTRACTION_SCHEMA_VERSION } from '@/lib/contract-extraction/schema-version'

// =============================================================================
// Contract — canonical persistence-side schema for `p_contract` in the
// `create_property` RPC payload.
//
// NOT the LLM-output schema — that lives in
// `src/lib/contract-extraction/schema.ts` and validates the extraction
// engine's output. This file describes the slice of state that gets handed
// to the persistence boundary: the upload metadata the server action needs
// to compute the storage path + the row, plus the extraction snapshot
// (already normalized by the engine) so the RPC can write it onto the
// contract row's JSONB columns.
//
// Money / country: contracts don't carry money or country directly; both
// live on adjacent records (rent, property).
// =============================================================================

/**
 * Mime types the `contracts` Storage bucket accepts. Mirrors the
 * `allowed_mime_types` array on the bucket itself
 * (`supabase/migrations/20260510120900_contracts_storage_bucket.sql`).
 */
export const CONTRACT_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
] as const

export type ContractMimeType = (typeof CONTRACT_MIME_TYPES)[number]

// Bucket-level cap is 25 MB; mirror here so the validation error fires
// before the RPC call rather than at upload time.
const MAX_CONTRACT_BYTES = 26_214_400

// File extension as recorded in the storage path
// (`{unit_id}/{contract_id}.<ext>`). Keep it tight — no leading dot, no
// path separators, ASCII alnum only.
const EXTENSION_RE = /^[a-z0-9]{1,8}$/

// =============================================================================
// Extraction payload — the slice of `ContractExtractionResult` that gets
// persisted onto the `contracts` row's JSONB columns. We re-validate at the
// persistence boundary so a manually-constructed submission (or one whose
// shape drifted in flight) can't slip past.
//
// `extraction_data` is intentionally typed as `z.unknown()` — its strict
// shape is the LLM-output `contractExtractionLlmResultShape` schema in
// `src/lib/contract-extraction/schema.ts`. Wiring that here would create a
// circular dependency between persistence and extraction modules; the
// submission schema enforces `schema_version` match instead, and the RPC
// stores the JSONB blob as-is.
// =============================================================================

export const contractExtractionPayloadSchema = z.object({
  extraction_data: z.unknown(),
  extraction_language: z
    .string()
    .min(1, { error: 'required' })
    .max(16, { error: 'tooLong' }),
  extraction_model: z
    .string()
    .min(1, { error: 'required' })
    .max(128, { error: 'tooLong' }),
  extraction_schema_version: z
    .number()
    .int({ error: 'invalidSchemaVersion' })
    .min(1, { error: 'invalidSchemaVersion' }),
  raw_text: z.string(),
  extracted_at: z.string().min(1, { error: 'required' }),
})

export type ContractExtractionPayload = z.infer<typeof contractExtractionPayloadSchema>

// =============================================================================
// Full contract input — what the wizard hands to the server action when the
// user uploaded a file at Step 1. The `extraction` block is optional because
// extraction can fail (timeout, unsupported format, etc.) and the wizard
// still lets the landlord proceed — the row gets `extraction_schema_version
// = 0` (sentinel for "not extracted") in that case.
// =============================================================================

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
    extraction: contractExtractionPayloadSchema.nullable().default(null),
  })
  .superRefine((contract, ctx) => {
    // When extraction is present, its schema version must match the in-code
    // constant. A mismatch means the wizard captured a snapshot under a now-
    // stale shape; the action surfaces this as a validation error and the
    // wizard re-runs extraction.
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
