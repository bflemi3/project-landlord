import { describe, it, expect } from 'vitest'
import { extractCnpjsFromText } from '../cnpj-extract'

describe('extractCnpjsFromText', () => {
  it('extracts formatted CNPJ', () => {
    expect(extractCnpjsFromText('CNPJ: 49.449.868/0001-62')).toEqual(['49449868000162'])
  })

  it('extracts unformatted CNPJ', () => {
    expect(extractCnpjsFromText('CNPJ 49449868000162')).toEqual(['49449868000162'])
  })

  it('extracts multiple CNPJs', () => {
    const result = extractCnpjsFromText('CNPJ: 49.449.868/0001-62 and 33.000.167/0001-01')
    expect(result).toHaveLength(2)
  })

  it('returns empty for no CNPJ', () => {
    expect(extractCnpjsFromText('CPF 040.032.329-09')).toEqual([])
  })

  it('deduplicates', () => {
    expect(extractCnpjsFromText('49.449.868/0001-62 repeated 49.449.868/0001-62')).toEqual(['49449868000162'])
  })

  it('filters invalid check digits', () => {
    const result = extractCnpjsFromText('CNPJ: 48.581.571/0001-93 barcode 14120000098598')
    expect(result).toEqual(['48581571000193'])
  })
})
