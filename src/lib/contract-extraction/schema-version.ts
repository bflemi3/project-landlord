/**
 * Contract-extraction schema version.
 *
 * Single source of truth for the `ContractExtractionLlmResult` shape version.
 * Imported by:
 *
 * - The extraction engine (`extract-contract.ts`) — emits via the result so
 *   callers know which shape they received.
 * - The persistence path (server action / RPC payload builder) — written
 *   onto the `contracts.extraction_schema_version` column so future readers
 *   can gate on shape when the type evolves.
 * - Any consumer of `contracts.extraction_data` that needs to gate behavior
 *   on the JSONB shape.
 *
 * Bump policy: on every breaking change to `ContractExtractionLlmResult` in
 * `types.ts` / `schema.ts`. Reviewer responsibility — the value drift is the
 * only flag.
 *
 * Sentinel `0` lives on the `contracts.extraction_schema_version` column
 * default and means "no extraction performed yet" — it is never assigned to
 * this constant.
 */
export const CONTRACT_EXTRACTION_SCHEMA_VERSION = 1
