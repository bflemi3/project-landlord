import { describe, it, expect } from 'vitest'
import { parseEnlivBillText } from '../pdf-parser'

// This is the raw text that pdf-parse extracts from the Enliv PDF.
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
Consumo Total do Mês: 269 kWh Consumo de Energia
Limpa: 7,61 kWh
Valor sem Enliv:
R$ 236,77
Desconto Enliv:
R$ 18,30
Valor a pagar:
R$ 218,47
74891.16009 06660.307304 32263.871033 5 14260000021847
Tarifa com Impostos
e Bandeiras 269 kWh R$ 0,829554 R$ 223,15
Iluminação Pública R$ 13,62
Demais Encargos R$ 0,00
Ajuste Desconto R$ 17,23
Desconto ENLIV
sobre Energia Limpa -7,61 kWh R$ 0,140604 R$ 1,07`

describe('parseEnlivBillText', () => {
  it('extracts customer info', () => {
    const result = parseEnlivBillText(sampleText)
    expect(result.customerName).toBe('Alex Amorim Anton')
    expect(result.customerCpf).toBe('040.032.329-09')
    expect(result.installationNumber).toBe('59069412')
  })

  it('extracts provider info', () => {
    const result = parseEnlivBillText(sampleText)
    expect(result.providerName).toBe('Enliv')
    expect(result.providerCnpj).toBe('49.449.868/0001-62')
  })

  it('extracts billing details', () => {
    const result = parseEnlivBillText(sampleText)
    expect(result.referenceMonth).toBe('MAR/2026')
    expect(result.issueDate).toBe('22/03/2026')
    expect(result.dueDate).toBe('24/04/2026')
    expect(result.consumptionKwh).toBe(269)
    expect(result.amountDue).toBe(218.47)
  })

  it('extracts barcode', () => {
    const result = parseEnlivBillText(sampleText)
    expect(result.linhaDigitavel).toBe(
      '74891.16009 06660.307304 32263.871033 5 14260000021847',
    )
  })

  it('extracts line items', () => {
    const result = parseEnlivBillText(sampleText)
    expect(result.lineItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          description: 'Tarifa com Impostos e Bandeiras',
          value: 223.15,
        }),
        expect.objectContaining({
          description: 'Iluminação Pública',
          value: 13.62,
        }),
        expect.objectContaining({
          description: 'Demais Encargos',
          value: 0.0,
        }),
        expect.objectContaining({
          description: 'Ajuste Desconto',
          value: 17.23,
        }),
      ]),
    )
  })
})
