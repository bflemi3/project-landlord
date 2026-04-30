import { describe, it, expect } from 'vitest'

import {
  defaultPropertyInput,
  propertySchema,
  type PropertyInput,
} from '../schema'

const VALID_MINIMUM = {
  postal_code: '01310-100',
  street: 'Rua Augusta',
  number: '123',
  city: 'São Paulo',
  state: 'SP',
}

function fieldErrors(input: unknown) {
  const result = propertySchema.safeParse(input)
  if (result.success) return null
  return z_flatten(result.error)
}

// `z.flattenError` lives at different paths across Zod minor releases. Inline
// a tiny equivalent that buckets issues by their first path segment so tests
// don't depend on which version exposes the helper.
function z_flatten(error: { issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }> }) {
  const fieldErrors: Record<string, string[]> = {}
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? '_root')
    fieldErrors[key] ??= []
    fieldErrors[key]!.push(issue.message)
  }
  return fieldErrors
}

describe('propertySchema — happy path', () => {
  it('parses a valid minimum input (required fields populated; name + complement omitted)', () => {
    const result = propertySchema.safeParse(VALID_MINIMUM)
    expect(result.success).toBe(true)
  })

  it('applies country_code default of "BR" when omitted', () => {
    const result = propertySchema.parse(VALID_MINIMUM)
    expect(result.country_code).toBe('BR')
  })

  it('applies name default of "" when omitted', () => {
    const result = propertySchema.parse(VALID_MINIMUM)
    expect(result.name).toBe('')
  })

  it('applies complement default of "" when omitted', () => {
    const result = propertySchema.parse(VALID_MINIMUM)
    expect(result.complement).toBe('')
  })

  it('applies neighborhood default of "" when omitted', () => {
    const result = propertySchema.parse(VALID_MINIMUM)
    expect(result.neighborhood).toBe('')
  })

  it('applies property_type default of null when omitted', () => {
    const result = propertySchema.parse(VALID_MINIMUM)
    expect(result.property_type).toBeNull()
  })
})

describe('propertySchema — required field errors', () => {
  it('flags missing postal_code with "required"', () => {
    const errors = fieldErrors({ ...VALID_MINIMUM, postal_code: '' })
    expect(errors?.postal_code).toEqual(['required'])
  })

  it('flags missing street with "required"', () => {
    const errors = fieldErrors({ ...VALID_MINIMUM, street: '' })
    expect(errors?.street).toEqual(['required'])
  })

  it('flags missing number with "required"', () => {
    const errors = fieldErrors({ ...VALID_MINIMUM, number: '' })
    expect(errors?.number).toEqual(['required'])
  })

  it('flags missing city with "required"', () => {
    const errors = fieldErrors({ ...VALID_MINIMUM, city: '' })
    expect(errors?.city).toEqual(['required'])
  })

  it('flags missing state with "required"', () => {
    const errors = fieldErrors({ ...VALID_MINIMUM, state: '' })
    expect(errors?.state).toEqual(['required'])
  })
})

describe('propertySchema — length boundaries', () => {
  it('accepts a name at the boundary (100 chars)', () => {
    const result = propertySchema.safeParse({
      ...VALID_MINIMUM,
      name: 'a'.repeat(100),
    })
    expect(result.success).toBe(true)
  })

  it('rejects a name longer than 100 chars with "tooLong"', () => {
    const errors = fieldErrors({ ...VALID_MINIMUM, name: 'a'.repeat(101) })
    expect(errors?.name).toEqual(['tooLong'])
  })

  it('rejects a street longer than 200 chars with "tooLong"', () => {
    const errors = fieldErrors({ ...VALID_MINIMUM, street: 'a'.repeat(201) })
    expect(errors?.street).toEqual(['tooLong'])
  })

  it('rejects a number longer than 20 chars with "tooLong"', () => {
    const errors = fieldErrors({ ...VALID_MINIMUM, number: '1'.repeat(21) })
    expect(errors?.number).toEqual(['tooLong'])
  })

  it('rejects a complement longer than 100 chars with "tooLong"', () => {
    const errors = fieldErrors({ ...VALID_MINIMUM, complement: 'a'.repeat(101) })
    expect(errors?.complement).toEqual(['tooLong'])
  })

  it('rejects a neighborhood longer than 100 chars with "tooLong"', () => {
    const errors = fieldErrors({ ...VALID_MINIMUM, neighborhood: 'a'.repeat(101) })
    expect(errors?.neighborhood).toEqual(['tooLong'])
  })

  it('rejects a city longer than 100 chars with "tooLong"', () => {
    const errors = fieldErrors({ ...VALID_MINIMUM, city: 'A'.repeat(101) })
    expect(errors?.city).toEqual(['tooLong'])
  })
})

describe('propertySchema — type guards', () => {
  it('rejects a non-string postal_code', () => {
    const result = propertySchema.safeParse({
      ...VALID_MINIMUM,
      postal_code: 12345,
    })
    expect(result.success).toBe(false)
  })

  it('rejects a null required field (string expected)', () => {
    const result = propertySchema.safeParse({
      ...VALID_MINIMUM,
      street: null,
    })
    expect(result.success).toBe(false)
  })
})

describe('propertySchema — postal_code format', () => {
  it('accepts the masked Brazilian format "01310-100"', () => {
    const result = propertySchema.safeParse({
      ...VALID_MINIMUM,
      postal_code: '01310-100',
    })
    expect(result.success).toBe(true)
  })

  it('accepts the bare 8-digit form "01310100"', () => {
    const result = propertySchema.safeParse({
      ...VALID_MINIMUM,
      postal_code: '01310100',
    })
    expect(result.success).toBe(true)
  })

  it('rejects a wrong-length postal_code with "invalidPostalCode"', () => {
    const errors = fieldErrors({ ...VALID_MINIMUM, postal_code: '12345' })
    expect(errors?.postal_code).toEqual(['invalidPostalCode'])
  })

  it('rejects a malformed (dash-in-wrong-place) postal_code', () => {
    const errors = fieldErrors({ ...VALID_MINIMUM, postal_code: '0131-0100' })
    expect(errors?.postal_code).toEqual(['invalidPostalCode'])
  })

  it('rejects a postal_code with non-digit characters', () => {
    const errors = fieldErrors({ ...VALID_MINIMUM, postal_code: '01310-abc' })
    expect(errors?.postal_code).toEqual(['invalidPostalCode'])
  })
})

describe('propertySchema — city + state', () => {
  it('rejects a city containing digits with "invalidCity"', () => {
    const errors = fieldErrors({ ...VALID_MINIMUM, city: 'São Paulo 2' })
    expect(errors?.city).toEqual(['invalidCity'])
  })

  it('rejects an unknown state code with "invalidState"', () => {
    const errors = fieldErrors({ ...VALID_MINIMUM, state: 'XX' })
    expect(errors?.state).toEqual(['invalidState'])
  })
})

describe('propertySchema — property_type', () => {
  it.each(['apartment', 'house', 'commercial', 'other'] as const)(
    'accepts %s as a valid enum value',
    (value) => {
      const result = propertySchema.safeParse({
        ...VALID_MINIMUM,
        property_type: value,
      })
      expect(result.success).toBe(true)
    },
  )

  it('accepts null', () => {
    const result = propertySchema.safeParse({
      ...VALID_MINIMUM,
      property_type: null,
    })
    expect(result.success).toBe(true)
  })

  it('rejects any other string', () => {
    const result = propertySchema.safeParse({
      ...VALID_MINIMUM,
      property_type: 'condo',
    })
    expect(result.success).toBe(false)
  })
})

describe('defaultPropertyInput', () => {
  it('returns the canonical blank shape', () => {
    expect(defaultPropertyInput()).toEqual({
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
    })
  })

  it('returns a fresh object on each call (no shared reference)', () => {
    expect(defaultPropertyInput()).not.toBe(defaultPropertyInput())
  })

  it('does NOT pass schema validation (required fields are empty)', () => {
    // The defaults are the UI's blank-slate shape, not a valid submit. The
    // schema rejects them so Continue stays gated until the user fills in
    // the required fields.
    const result = propertySchema.safeParse(defaultPropertyInput())
    expect(result.success).toBe(false)
  })

  it('returns a value typed as PropertyInput at compile time', () => {
    // Type-level assertion: the inferred return type matches the schema's
    // z.infer output. If the schema gains/loses a field and the defaults
    // aren't updated, this line stops compiling.
    const _check: PropertyInput = defaultPropertyInput()
    expect(_check).toBeDefined()
  })
})
