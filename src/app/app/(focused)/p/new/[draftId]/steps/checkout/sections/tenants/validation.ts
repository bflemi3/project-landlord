// Cached per-section validation. See `expenses/validation.ts` for the
// pattern. Tenants validation depends on country (the row schema dispatcher
// is country-keyed), so the cache is two-level: rows reference, then country.

import { getTenantRowSchema, type TenantRow } from './schemas'

export type TenantRowParse = ReturnType<ReturnType<typeof getTenantRowSchema>['safeParse']>

export interface TenantsValidation {
  ok: boolean
  perRow: ReadonlyMap<string, TenantRowParse>
}

const cache = new WeakMap<readonly TenantRow[], Map<string, TenantsValidation>>()

export function validateTenants(
  rows: readonly TenantRow[],
  countryCode: string,
): TenantsValidation {
  let inner = cache.get(rows)
  if (!inner) {
    inner = new Map()
    cache.set(rows, inner)
  }
  const cached = inner.get(countryCode)
  if (cached) return cached
  const schema = getTenantRowSchema(countryCode)
  const perRow = new Map<string, TenantRowParse>()
  let ok = true
  for (const row of rows) {
    const result = schema.safeParse(row)
    perRow.set(row.id, result)
    if (!result.success) ok = false
  }
  const validation: TenantsValidation = { ok, perRow }
  inner.set(countryCode, validation)
  return validation
}
