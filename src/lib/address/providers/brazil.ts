import type { AddressProvider, AddressLookupResult, AddressFields, AddressValidationErrors, AddressValidationError } from '../types'

const VALID_STATE_CODES = new Set([
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS',
  'MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC',
  'SP','SE','TO',
])

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

export const brazilProvider: AddressProvider = {
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
    const errors: Record<string, AddressValidationError> = {}

    // Postal code: exactly 8 digits
    const cepDigits = (fields.postal_code ?? '').replace(/\D/g, '')
    if (!cepDigits) {
      errors.postal_code = 'required'
    } else if (cepDigits.length !== 8) {
      errors.postal_code = 'invalidPostalCode'
    }

    // Street: required, max 200, no HTML
    if (!fields.street) {
      errors.street = 'required'
    } else if (fields.street.length > 200) {
      errors.street = 'tooLong'
    }

    // Number: required, max 20
    if (!fields.number) {
      errors.number = 'required'
    } else if (fields.number.length > 20) {
      errors.number = 'tooLong'
    }

    // Complement: optional, max 100
    if (fields.complement && fields.complement.length > 100) {
      errors.complement = 'tooLong'
    }

    // Neighborhood: optional, max 100
    if (fields.neighborhood && fields.neighborhood.length > 100) {
      errors.neighborhood = 'tooLong'
    }

    // City: required, max 100, no digits
    if (!fields.city) {
      errors.city = 'required'
    } else if (fields.city.length > 100) {
      errors.city = 'tooLong'
    } else if (/\d/.test(fields.city)) {
      errors.city = 'invalidCity'
    }

    // State: required, must be valid code
    if (!fields.state) {
      errors.state = 'required'
    } else if (!VALID_STATE_CODES.has(fields.state.toUpperCase())) {
      errors.state = 'invalidState'
    }

    return Object.keys(errors).length > 0 ? errors : null
  },
}
