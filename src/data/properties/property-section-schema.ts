import { z } from 'zod'

import { Constants } from '@/lib/types/database'
import type { Database } from '@/lib/types/database'

/**
 * Zod schema for the property section's input. Single source of truth for
 * Property section validation — used client-side by the wizard's section
 * component (Tasks 3+) and server-side by the future `createProperty` action.
 *
 * Error messages are i18n keys under the `properties.*` namespace; the section
 * runs them through `useTranslations('properties')` so the user sees translated
 * text. Reuses the same keys the legacy validator (`validatePropertyCore`)
 * already emits.
 *
 * `defaultPropertySectionValues()` returns the blank-slate shape components
 * render before the user types anything. The defaults intentionally do NOT
 * pass schema validation — required fields are empty strings, which the schema
 * rejects with `'required'`. The defaults exist for the initial UI shape; the
 * schema gates Continue once the user has filled the required fields.
 */

type PropertyType = Database['public']['Enums']['property_type']
const PROPERTY_TYPES = Constants.public.Enums.property_type as readonly PropertyType[]

// Brazilian CEP — accepts the masked form `01310-100` or the bare 8-digit
// form `01310100`. Anything else (mid-typed, wrong length, non-digits) fails.
const POSTAL_CODE_RE = /^(?:\d{5}-\d{3}|\d{8})$/

// Canonical BR state codes. Mirrors `getAddressProvider('BR').states`; a
// dedicated `Set` here keeps the schema standalone (no module dependency on
// the address provider) and gives O(1) membership tests inside the refine.
const BR_STATE_CODES = new Set([
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS',
  'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC',
  'SP', 'SE', 'TO',
])

export const propertySectionSchema = z.object({
  name: z
    .string()
    .max(100, { error: 'tooLong' })
    .default(''),
  postal_code: z.string().superRefine((value, ctx) => {
    // Distinct messages: empty → 'required', non-empty-but-malformed →
    // 'invalidPostalCode'. `.min` + `.regex` chained would emit both for empty
    // input; superRefine with an early return guarantees a single issue.
    if (value.length === 0) {
      ctx.addIssue({ code: 'custom', message: 'required' })
      return
    }
    if (!POSTAL_CODE_RE.test(value)) {
      ctx.addIssue({ code: 'custom', message: 'invalidPostalCode' })
    }
  }),
  street: z
    .string()
    .min(1, { error: 'required' })
    .max(200, { error: 'tooLong' }),
  number: z
    .string()
    .min(1, { error: 'required' })
    .max(20, { error: 'tooLong' }),
  complement: z
    .string()
    .max(100, { error: 'tooLong' })
    .default(''),
  neighborhood: z
    .string()
    .max(100, { error: 'tooLong' })
    .default(''),
  city: z.string().superRefine((value, ctx) => {
    if (value.length === 0) {
      ctx.addIssue({ code: 'custom', message: 'required' })
      return
    }
    if (value.length > 100) {
      ctx.addIssue({ code: 'custom', message: 'tooLong' })
      return
    }
    if (/\d/.test(value)) {
      ctx.addIssue({ code: 'custom', message: 'invalidCity' })
    }
  }),
  state: z.string().superRefine((value, ctx) => {
    if (value.length === 0) {
      ctx.addIssue({ code: 'custom', message: 'required' })
      return
    }
    // Accept any of the canonical BR state codes. The Select widget sources
    // its options from `getAddressProvider('BR').states`, so a manually-typed
    // value is the only path to invalidState.
    if (!BR_STATE_CODES.has(value.toUpperCase())) {
      ctx.addIssue({ code: 'custom', message: 'invalidState' })
    }
  }),
  country_code: z.string().default('BR'),
  property_type: z.enum(PROPERTY_TYPES).nullable().default(null),
})

export type PropertySectionValues = z.infer<typeof propertySectionSchema>

/**
 * Blank-slate values used by the Provider's eager init in `defaultState()` so
 * components read a populated slice from first render. Required-field values
 * are empty strings; the schema's `'required'` issues fire once the user
 * blurs without filling them in (Task 3 wires the per-field error UI).
 */
export function defaultPropertySectionValues(): PropertySectionValues {
  return {
    name: '',
    postal_code: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    country_code: 'BR',
    property_type: null,
  }
}
