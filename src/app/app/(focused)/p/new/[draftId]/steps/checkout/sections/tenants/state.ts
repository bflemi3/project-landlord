import type { PropertyInput } from '@/schemas/property'

import type { PropertyCreationStateShape } from '../../../../state/store'
import {
  TENANT_ROW_FIELD_NAMES,
  type TenantRow,
} from './schemas'
import { validateTenants } from './validation'

export type TenantsTouched = Record<string, ReadonlySet<string>>

/** Server-error slice for this row section. Keyed by stable row `id`, never
 *  index — row delete must not shift other rows' errors. */
export type TenantsServerErrors = Record<string /* rowId */, Record<string, string[]>>

export function defaultServerErrors(): TenantsServerErrors {
  return {}
}

export function applyServerErrors(slice: TenantsServerErrors) {
  return (): TenantsServerErrors => slice
}

export function clearRowServerErrors(rowId: string) {
  return (prev: TenantsServerErrors): TenantsServerErrors => {
    if (prev[rowId] == null) return prev
    const next = { ...prev }
    delete next[rowId]
    return next
  }
}

export function clearFieldServerError(rowId: string, field: string) {
  return (prev: TenantsServerErrors): TenantsServerErrors => {
    const row = prev[rowId]
    if (!row || row[field] == null) return prev
    const nextRow = { ...row }
    delete nextRow[field]
    if (Object.keys(nextRow).length === 0) {
      const next = { ...prev }
      delete next[rowId]
      return next
    }
    return { ...prev, [rowId]: nextRow }
  }
}

export function isValid(state: PropertyCreationStateShape): boolean {
  const country =
    (state.sectionData.property as PropertyInput | undefined)?.country_code ??
    'BR'
  return validateTenants(state.sectionData.tenants as TenantRow[], country).ok
}

export function isDefault(slice: TenantRow[] | undefined): boolean {
  return !slice || slice.length === 0
}

export function defaultTouched(): TenantsTouched {
  return {}
}

export function setAllTouched(
  prev: TenantsTouched,
  sectionData: TenantRow[] | undefined,
): TenantsTouched {
  if (!sectionData || sectionData.length === 0) return prev
  let changed = false
  const next: TenantsTouched = { ...prev }
  for (const row of sectionData) {
    const existing = next[row.id]
    if (existing && TENANT_ROW_FIELD_NAMES.every((f) => existing.has(f))) continue
    next[row.id] = new Set(TENANT_ROW_FIELD_NAMES)
    changed = true
  }
  return changed ? next : prev
}
