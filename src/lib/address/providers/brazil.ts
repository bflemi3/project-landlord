import type { AddressLookupResult, AddressProvider } from '../types'

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
}
