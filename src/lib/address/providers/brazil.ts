import { z } from 'zod'
import type { AddressProvider, AddressLookupResult, AddressFields, AddressValidationErrors } from '../types'
import { propertyAddressShapeSchema } from '@/data/properties/schema'

const BRAZILIAN_STATES = [
  { code: 'AC', name: 'Acre' },
  { code: 'AL', name: 'Alagoas' },
  { code: 'AP', name: 'Amapá' },
  { code: 'AM', name: 'Amazonas' },
  { code: 'BA', name: 'Bahia' },
  { code: 'CE', name: 'Ceará' },
  { code: 'DF', name: 'Distrito Federal' },
  { code: 'ES', name: 'Espírito Santo' },
  { code: 'GO', name: 'Goiás' },
  { code: 'MA', name: 'Maranhão' },
  { code: 'MT', name: 'Mato Grosso' },
  { code: 'MS', name: 'Mato Grosso do Sul' },
  { code: 'MG', name: 'Minas Gerais' },
  { code: 'PA', name: 'Pará' },
  { code: 'PB', name: 'Paraíba' },
  { code: 'PR', name: 'Paraná' },
  { code: 'PE', name: 'Pernambuco' },
  { code: 'PI', name: 'Piauí' },
  { code: 'RJ', name: 'Rio de Janeiro' },
  { code: 'RN', name: 'Rio Grande do Norte' },
  { code: 'RS', name: 'Rio Grande do Sul' },
  { code: 'RO', name: 'Rondônia' },
  { code: 'RR', name: 'Roraima' },
  { code: 'SC', name: 'Santa Catarina' },
  { code: 'SP', name: 'São Paulo' },
  { code: 'SE', name: 'Sergipe' },
  { code: 'TO', name: 'Tocantins' },
]

const cache = new Map<string, AddressLookupResult | null>()

export const BRAZILIAN_POSTAL_CODE_RE = /^(?:\d{5}-\d{3}|\d{8})$/
export const BRAZILIAN_STATE_CODES = new Set([
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS',
  'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC',
  'SP', 'SE', 'TO',
])

export const addressSchema = propertyAddressShapeSchema.extend({
  postal_code: propertyAddressShapeSchema.shape.postal_code.superRefine((value, ctx) => {
    if (value.length === 0) {
      return
    }
    if (!BRAZILIAN_POSTAL_CODE_RE.test(value)) {
      ctx.addIssue({ code: 'custom', message: 'invalidPostalCode' })
    }
  }),
  city: propertyAddressShapeSchema.shape.city.superRefine((value, ctx) => {
    if (value.length === 0 || value.length > 100) {
      return
    }
    if (/\d/.test(value)) {
      ctx.addIssue({ code: 'custom', message: 'invalidCity' })
    }
  }),
  state: propertyAddressShapeSchema.shape.state.superRefine((value, ctx) => {
    if (value.length === 0 || value.length > 100) return
    if (!BRAZILIAN_STATE_CODES.has(value.toUpperCase())) {
      ctx.addIssue({ code: 'custom', message: 'invalidState' })
    }
  }),
})

export const brazilProvider: AddressProvider = {
  addressSchema,
  postalCodePattern: /^\d{5}-?\d{3}$/,
  postalCodePlaceholder: '01310-100',
  postalCodeLabel: 'CEP',
  states: BRAZILIAN_STATES,

  formatPostalCode(raw: string): string {
    const digits = raw.replace(/\D/g, '')
    if (digits.length <= 5) return digits
    return `${digits.slice(0, 5)}-${digits.slice(5, 8)}`
  },

  async lookupPostalCode(code: string): Promise<AddressLookupResult | null> {
    const digits = code.replace(/\D/g, '')
    if (digits.length !== 8) return null

    if (cache.has(digits)) return cache.get(digits)!

    try {
      const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
      if (!response.ok) {
        cache.set(digits, null)
        return null
      }

      const data = await response.json()
      if (data.erro) {
        cache.set(digits, null)
        return null
      }

      const result: AddressLookupResult = {
        street: data.logradouro || null,
        neighborhood: data.bairro || null,
        city: data.localidade || null,
        state: data.uf || null,
      }
      cache.set(digits, result)
      return result
    } catch {
      return null
    }
  },

  validateAddress(fields: AddressFields): AddressValidationErrors | null {
    const result = addressSchema.safeParse(fields)

    if (result.success) return null

    const fieldErrors = z.flattenError(result.error).fieldErrors as AddressValidationErrors
    return Object.keys(fieldErrors).length > 0 ? fieldErrors : null
  },
}
