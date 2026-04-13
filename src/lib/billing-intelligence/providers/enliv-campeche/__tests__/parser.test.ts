import { describe, it, expect } from 'vitest'
import { parseEnlivBillText } from '../parser'

const sampleText = `www.enliv.com.br
Suporte:
E-mail: atendimento@enliv.com.br
Whatsapp: (41) 99197-7364
Sobre a Enliv:
R. Heitor Stockler de França, 396. Centro Cívico, Curitiba - PR Ed. Neo Corporate - Sala 501. CEP: 800030-030
CNPJ: 49.449.868/0001-62
Cliente:
Alex Amorim Anton
Endereço:
Avenida Campeche, 533,
Campeche 88063-300 -
Florianópolis / SC
CNPJ/CPF:
040.032.329-09
Número da Instalação:
59069412
Mês de Referência:
MAR/2026
Data de Emissão:
22/03/2026
Vencimento:
24/04/2026
Consumo Total do Mês: 269 kWh
Valor a pagar:
R$ 218,47
74891.16009 06660.307304 32263.871033 5 14260000021847`

describe('parseEnlivBillText', () => {
  it('returns ExtractionResult with profile ID', () => {
    const result = parseEnlivBillText(sampleText)
    expect(result).not.toBeNull()
    expect(result!.provider.profileId).toBe('a1b2c3d4-0002-0002-0002-000000000001')
    expect(result!.provider.taxId).toBe('49449868000162')
    expect(result!.provider.category).toBe('electricity')
  })

  it('extracts customer info', () => {
    const result = parseEnlivBillText(sampleText)!
    expect(result.customer.name).toBe('Alex Amorim Anton')
    expect(result.customer.taxId).toBe('040.032.329-09')
    expect(result.customer.taxIdType).toBe('cpf')
    expect(result.customer.countryCode).toBe('BR')
    expect(result.customer.accountNumber).toBe('59069412')
  })

  it('normalizes dates and amounts', () => {
    const result = parseEnlivBillText(sampleText)!
    expect(result.billing.referenceMonth).toBe('2026-03')
    expect(result.billing.dueDate).toBe('2026-04-24')
    expect(result.billing.amountDue).toBe(21847)
    expect(result.billing.currency).toBe('BRL')
  })

  it('extracts consumption', () => {
    const result = parseEnlivBillText(sampleText)!
    expect(result.consumption).toEqual({ value: 269, unit: 'kWh' })
  })

  it('normalizes barcode', () => {
    const result = parseEnlivBillText(sampleText)!
    expect(result.payment.linhaDigitavel).toBe('74891160090666030730432263871033514260000021847')
  })

  it('uses buildExtractionConfidence for uniform scoring', () => {
    const result = parseEnlivBillText(sampleText)!
    expect(result.confidence.source.method).toBe('pdf')
    expect(result.confidence.source.methodScore).toBe(0.80)
    expect(result.confidence.fields.amountDue.extraction).toBe(0.80)
    expect(result.confidence.fields.amountDue.status).toBe('needs-review')
    expect(result.confidence.summary.totalFields).toBe(8)
    expect(result.rawSource).toBe('pdf')
  })

  it('returns null for non-Enliv text', () => {
    expect(parseEnlivBillText('random text')).toBeNull()
  })
})
