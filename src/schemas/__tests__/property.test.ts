import { describe, it, expect } from 'vitest'
import { z } from 'zod'

import {
  brazilAddressSchema,
  defaultPropertyInput,
  fallbackAddressSchema,
  getPropertyInputSchema,
  propertyAddressInputBaseSchema,
  propertyInputBaseSchema,
  propertyInputFormDataSchema,
  propertyInputSchema,
  type PropertyInput,
} from '../property'

const VALID_MINIMUM = {
  postal_code: '01310-100',
  street: 'Rua Augusta',
  number: '123',
  city: 'São Paulo',
  state: 'SP',
}

function fieldErrors(input: unknown) {
  const result = propertyInputSchema.safeParse(input)
  if (result.success) return null
  return z.flattenError(result.error).fieldErrors
}

function addressFieldErrors(input: unknown) {
  const result = propertyAddressInputBaseSchema.safeParse(input)
  if (result.success) return null
  return z.flattenError(result.error).fieldErrors
}

function formDataFieldErrors(formData: FormData) {
  const result = propertyInputFormDataSchema.safeParse(formData)
  if (result.success) return null
  return z.flattenError(result.error).fieldErrors
}

describe('propertyInputBaseSchema', () => {
  it('applies base defaults', () => {
    const result = propertyInputBaseSchema.parse({})

    expect(result).toEqual({
      name: '',
      country_code: 'BR',
      property_type: null,
    })
  })

  it('rejects a long name with "tooLong"', () => {
    const result = propertyInputBaseSchema.safeParse({ name: 'a'.repeat(101) })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(z.flattenError(result.error).fieldErrors.name).toEqual(['tooLong'])
    }
  })

  it('rejects an invalid property type with "invalidPropertyType"', () => {
    const result = propertyInputBaseSchema.safeParse({ property_type: 'condo' })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(z.flattenError(result.error).fieldErrors.property_type).toEqual([
        'invalidPropertyType',
      ])
    }
  })
})

describe('propertyAddressInputBaseSchema', () => {
  it('parses the generic persisted address shape', () => {
    const result = propertyAddressInputBaseSchema.safeParse(VALID_MINIMUM)

    expect(result.success).toBe(true)
  })

  it('applies optional address defaults', () => {
    const result = propertyAddressInputBaseSchema.parse(VALID_MINIMUM)

    expect(result.complement).toBe('')
    expect(result.neighborhood).toBe('')
  })

  it('flags required address fields with "required"', () => {
    const errors = addressFieldErrors({
      postal_code: '',
      street: '',
      number: '',
      city: '',
      state: '',
    })

    expect(errors?.postal_code).toEqual(['required'])
    expect(errors?.street).toEqual(['required'])
    expect(errors?.number).toEqual(['required'])
    expect(errors?.city).toEqual(['required'])
    expect(errors?.state).toEqual(['required'])
  })

  it('flags missing required address keys with "required"', () => {
    const errors = addressFieldErrors({})

    expect(errors?.postal_code).toEqual(['required'])
    expect(errors?.street).toEqual(['required'])
    expect(errors?.number).toEqual(['required'])
    expect(errors?.city).toEqual(['required'])
    expect(errors?.state).toEqual(['required'])
  })

  it('keeps country-specific address semantics out of the generic shape', () => {
    const result = propertyAddressInputBaseSchema.safeParse({
      ...VALID_MINIMUM,
      postal_code: 'not-a-cep',
      city: 'São Paulo 2',
      state: 'XX',
    })

    expect(result.success).toBe(true)
  })
})

describe('propertyInputSchema — happy path (Brazil-first default)', () => {
  it('parses a valid minimum input', () => {
    const result = propertyInputSchema.safeParse(VALID_MINIMUM)
    expect(result.success).toBe(true)
  })

  it('applies country_code default of "BR" when omitted', () => {
    const result = propertyInputSchema.parse(VALID_MINIMUM)
    expect(result.country_code).toBe('BR')
  })

  it('applies name default of "" when omitted', () => {
    const result = propertyInputSchema.parse(VALID_MINIMUM)
    expect(result.name).toBe('')
  })

  it('applies complement default of "" when omitted', () => {
    const result = propertyInputSchema.parse(VALID_MINIMUM)
    expect(result.complement).toBe('')
  })

  it('applies neighborhood default of "" when omitted', () => {
    const result = propertyInputSchema.parse(VALID_MINIMUM)
    expect(result.neighborhood).toBe('')
  })

  it('applies property_type default of null when omitted', () => {
    const result = propertyInputSchema.parse(VALID_MINIMUM)
    expect(result.property_type).toBeNull()
  })
})

describe('propertyInputSchema — required field errors', () => {
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

describe('propertyInputSchema — length boundaries', () => {
  it('accepts a name at the boundary (100 chars)', () => {
    const result = propertyInputSchema.safeParse({
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

  it('rejects a state longer than 100 chars with "tooLong"', () => {
    const errors = fieldErrors({ ...VALID_MINIMUM, state: 'A'.repeat(101) })
    expect(errors?.state).toEqual(['tooLong'])
  })

  it('rejects a postal_code longer than 32 chars with "tooLong"', () => {
    // The Brazil-specific format check also fires on this value (33 chars
    // doesn't match the CEP regex), so multiple issues are surfaced.
    const errors = fieldErrors({ ...VALID_MINIMUM, postal_code: '1'.repeat(33) })
    expect(errors?.postal_code).toContain('tooLong')
  })
})

describe('propertyInputSchema — type guards', () => {
  it('rejects a non-string postal_code', () => {
    const result = propertyInputSchema.safeParse({
      ...VALID_MINIMUM,
      postal_code: 12345,
    })
    expect(result.success).toBe(false)
  })

  it('rejects a null required field (string expected)', () => {
    const result = propertyInputSchema.safeParse({
      ...VALID_MINIMUM,
      street: null,
    })
    expect(result.success).toBe(false)
  })
})

describe('propertyInputSchema — Brazil-specific address rules (applied by default)', () => {
  it('accepts the masked Brazilian postal code format', () => {
    const result = propertyInputSchema.safeParse({
      ...VALID_MINIMUM,
      postal_code: '01310-100',
    })
    expect(result.success).toBe(true)
  })

  it('accepts the bare 8-digit Brazilian postal code format', () => {
    const result = propertyInputSchema.safeParse({
      ...VALID_MINIMUM,
      postal_code: '01310100',
    })
    expect(result.success).toBe(true)
  })

  it('rejects a malformed postal_code with "invalidPostalCode"', () => {
    const errors = fieldErrors({ ...VALID_MINIMUM, postal_code: '01310-abc' })
    expect(errors?.postal_code).toEqual(['invalidPostalCode'])
  })

  it('rejects a city containing digits with "invalidCity"', () => {
    const errors = fieldErrors({ ...VALID_MINIMUM, city: 'São Paulo 2' })
    expect(errors?.city).toEqual(['invalidCity'])
  })

  it('rejects a non-Brazilian state code with "invalidState"', () => {
    const errors = fieldErrors({ ...VALID_MINIMUM, state: 'XX' })
    expect(errors?.state).toEqual(['invalidState'])
  })
})

describe('propertyInputSchema — property_type', () => {
  it.each(['apartment', 'house', 'commercial', 'other'] as const)(
    'accepts %s as a valid enum value',
    (value) => {
      const result = propertyInputSchema.safeParse({
        ...VALID_MINIMUM,
        property_type: value,
      })
      expect(result.success).toBe(true)
    },
  )

  it('accepts null', () => {
    const result = propertyInputSchema.safeParse({
      ...VALID_MINIMUM,
      property_type: null,
    })
    expect(result.success).toBe(true)
  })

  it('rejects any other string with "invalidPropertyType"', () => {
    const errors = fieldErrors({ ...VALID_MINIMUM, property_type: 'condo' })
    expect(errors?.property_type).toEqual(['invalidPropertyType'])
  })
})

describe('propertyInputFormDataSchema', () => {
  it('preprocesses FormData into a PropertyInput', () => {
    const formData = new FormData()
    formData.set('name', '  <strong>Casa</strong>  ')
    formData.set('postal_code', ' 01310-100 ')
    formData.set('street', ' <b>Rua Augusta</b> ')
    formData.set('number', ' 123 ')
    formData.set('city', ' São Paulo ')
    formData.set('state', ' SP ')
    formData.set('country_code', '')
    formData.set('property_type', '')

    const result = propertyInputFormDataSchema.parse(formData)

    expect(result).toEqual({
      name: 'Casa',
      postal_code: '01310-100',
      street: 'Rua Augusta',
      number: '123',
      complement: '',
      neighborhood: '',
      city: 'São Paulo',
      state: 'SP',
      country_code: 'BR',
      property_type: null,
    })
  })

  it('returns translation-key field errors for invalid FormData', () => {
    const formData = new FormData()
    formData.set('postal_code', '')
    formData.set('street', '')
    formData.set('number', '')
    formData.set('city', '')
    formData.set('state', '')
    formData.set('property_type', 'condo')

    const errors = formDataFieldErrors(formData)

    expect(errors?.postal_code).toEqual(['required'])
    expect(errors?.street).toEqual(['required'])
    expect(errors?.number).toEqual(['required'])
    expect(errors?.city).toEqual(['required'])
    expect(errors?.state).toEqual(['required'])
    expect(errors?.property_type).toEqual(['invalidPropertyType'])
  })

  it('returns required errors when FormData omits required keys', () => {
    const errors = formDataFieldErrors(new FormData())

    expect(errors?.postal_code).toEqual(['required'])
    expect(errors?.street).toEqual(['required'])
    expect(errors?.number).toEqual(['required'])
    expect(errors?.city).toEqual(['required'])
    expect(errors?.state).toEqual(['required'])
  })

  it('passes a plain object through the preprocess and into the schema', () => {
    // The preprocess only rewrites FormData; non-FormData values flow straight
    // to the inner propertyInputSchema.
    const result = propertyInputFormDataSchema.safeParse(VALID_MINIMUM)
    expect(result.success).toBe(true)
  })
})

describe('brazilAddressSchema', () => {
  const validBrAddress = {
    postal_code: '01310-100',
    street: 'Rua Augusta',
    number: '123',
    city: 'São Paulo',
    state: 'SP',
  }

  function brazilFieldErrors(input: unknown) {
    const result = brazilAddressSchema.safeParse(input)
    if (result.success) return null
    return z.flattenError(result.error).fieldErrors
  }

  it('parses a valid Brazil address', () => {
    expect(brazilAddressSchema.safeParse(validBrAddress).success).toBe(true)
  })

  it('returns Brazil-specific translation keys for malformed values', () => {
    const errors = brazilFieldErrors({
      ...validBrAddress,
      postal_code: '123',
      city: 'São Paulo 123',
      state: 'XX',
    })

    expect(errors?.postal_code).toEqual(['invalidPostalCode'])
    expect(errors?.city).toEqual(['invalidCity'])
    expect(errors?.state).toEqual(['invalidState'])
  })

  it('returns translation-key errors for missing required keys', () => {
    const errors = brazilFieldErrors({})

    expect(errors?.postal_code).toEqual(['required'])
    expect(errors?.street).toEqual(['required'])
    expect(errors?.number).toEqual(['required'])
    expect(errors?.city).toEqual(['required'])
    expect(errors?.state).toEqual(['required'])
  })
})

describe('fallbackAddressSchema', () => {
  it('defaults optional persisted address fields', () => {
    expect(
      fallbackAddressSchema.parse({
        street: '123 Main St',
        city: 'Springfield',
      }),
    ).toEqual({
      postal_code: '',
      street: '123 Main St',
      number: '',
      complement: '',
      neighborhood: '',
      city: 'Springfield',
      state: '',
    })
  })
})

describe('getPropertyInputSchema — polymorphic dispatcher', () => {
  it('returns the Brazil schema for "BR"', () => {
    const schema = getPropertyInputSchema('BR')
    const result = schema.safeParse({
      ...VALID_MINIMUM,
      postal_code: '123',
      city: 'São Paulo 2',
      state: 'XX',
    })

    expect(result.success).toBe(false)
    if (result.success) return

    const errors = z.flattenError(result.error).fieldErrors
    expect(errors.postal_code).toEqual(['invalidPostalCode'])
    expect(errors.city).toEqual(['invalidCity'])
    expect(errors.state).toEqual(['invalidState'])
  })

  it('falls back to the relaxed schema for unsupported countries', () => {
    const schema = getPropertyInputSchema('US')
    const result = schema.parse({
      street: 'Main St',
      city: 'Austin',
      country_code: 'US',
    })

    expect(result).toEqual({
      name: '',
      postal_code: '',
      street: 'Main St',
      number: '',
      complement: '',
      neighborhood: '',
      city: 'Austin',
      state: '',
      country_code: 'US',
      property_type: null,
    })
  })

  it('defaults to the Brazil schema when no country code is provided', () => {
    const schema = getPropertyInputSchema()
    const errors = (() => {
      const r = schema.safeParse({ ...VALID_MINIMUM, postal_code: 'not-a-cep' })
      return r.success ? null : z.flattenError(r.error).fieldErrors
    })()
    expect(errors?.postal_code).toEqual(['invalidPostalCode'])
  })

  it('falls back for an empty country code', () => {
    const schema = getPropertyInputSchema('')
    // Fallback relaxes postal_code (optional with default ''), so the same
    // input that fails for "BR" succeeds here.
    const r = schema.safeParse({ ...VALID_MINIMUM, postal_code: 'not-a-cep' })
    expect(r.success).toBe(true)
  })

  it('case-sensitively dispatches ("br" falls back, only "BR" maps to Brazil)', () => {
    const schema = getPropertyInputSchema('br')
    const r = schema.safeParse({ ...VALID_MINIMUM, state: 'XX' })
    expect(r.success).toBe(true)
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
    const result = propertyInputSchema.safeParse(defaultPropertyInput())
    expect(result.success).toBe(false)
  })

  it('returns a value typed as PropertyInput at compile time', () => {
    const _check: PropertyInput = defaultPropertyInput()
    expect(_check).toBeDefined()
  })
})
