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

export function defaultTenantsServerErrors(): TenantsServerErrors {
  return {}
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
