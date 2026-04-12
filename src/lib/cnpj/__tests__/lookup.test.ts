import { describe, it, expect, vi, beforeEach } from 'vitest'
import { lookupCnpj, extractCnpjsFromText } from '../lookup'

describe('extractCnpjsFromText', () => {
  it('extracts formatted CNPJ from text', () => {
    const text = 'CNPJ: 49.449.868/0001-62 some other text'
    const result = extractCnpjsFromText(text)
    expect(result).toEqual(['49449868000162'])
  })

  it('extracts unformatted CNPJ from text', () => {
    const text = 'Company CNPJ 49449868000162 details'
    const result = extractCnpjsFromText(text)
    expect(result).toEqual(['49449868000162'])
  })

  it('extracts multiple CNPJs', () => {
    const text = 'CNPJ: 49.449.868/0001-62 and also 33.000.167/0001-01'
    const result = extractCnpjsFromText(text)
    expect(result).toHaveLength(2)
    expect(result).toContain('49449868000162')
    expect(result).toContain('33000167000101')
  })

  it('returns empty array when no CNPJ found', () => {
    const text = 'No CNPJ here, just CPF 040.032.329-09'
    const result = extractCnpjsFromText(text)
    expect(result).toEqual([])
  })

  it('deduplicates CNPJs', () => {
    const text = 'CNPJ: 49.449.868/0001-62 repeated 49.449.868/0001-62'
    const result = extractCnpjsFromText(text)
    expect(result).toEqual(['49449868000162'])
  })
})

describe('lookupCnpj', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns data from BrasilAPI on success', async () => {
    const mockData = {
      cnpj: '49449868000162',
      razao_social: 'ENLIV ENERGIA LTDA',
      nome_fantasia: 'ENLIV',
      situacao_cadastral: 'ATIVA',
      logradouro: 'R Heitor Stockler',
      numero: '396',
      complemento: 'Sala 501',
      bairro: 'Centro Civico',
      municipio: 'CURITIBA',
      uf: 'PR',
      cep: '80030030',
      cnae_fiscal: 3514000,
      cnae_fiscal_descricao: 'Distribuição de energia elétrica',
      telefone: '4199197-7364',
      email: 'atendimento@enliv.com.br',
    }

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(mockData), { status: 200 }),
    )

    const result = await lookupCnpj('49449868000162')

    expect(result.companyName).toBe('ENLIV')
    expect(result.activityDescription).toBe('Distribuição de energia elétrica')
    expect(result.source).toBe('brasilapi')
  })

  it('falls back to ReceitaWS when BrasilAPI fails', async () => {
    const mockReceitaData = {
      cnpj: '49449868000162',
      nome: 'ENLIV ENERGIA LTDA',
      fantasia: 'ENLIV',
      situacao: 'ATIVA',
      logradouro: 'R Heitor Stockler',
      numero: '396',
      complemento: 'Sala 501',
      bairro: 'Centro Civico',
      municipio: 'CURITIBA',
      uf: 'PR',
      cep: '80030030',
      atividade_principal: [
        { code: '35.14-0-00', text: 'Distribuição de energia elétrica' },
      ],
      telefone: '4199197-7364',
      email: 'atendimento@enliv.com.br',
    }

    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('Server error', { status: 500 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify(mockReceitaData), { status: 200 }),
      )

    const result = await lookupCnpj('49449868000162')

    expect(result.companyName).toBe('ENLIV')
    expect(result.source).toBe('receitaws')
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('throws when both APIs fail', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('Error', { status: 500 }))
      .mockResolvedValueOnce(new Response('Error', { status: 500 }))

    await expect(lookupCnpj('00000000000000')).rejects.toThrow(
      'CNPJ lookup failed: both BrasilAPI and ReceitaWS returned errors',
    )
  })
})
