import { describe, it, expect, vi, beforeEach } from 'vitest'
import { enlivCampeche } from '../index'

const sampleBillText = `www.enliv.com.br
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

describe('enlivCampeche Provider', () => {
  beforeEach(() => vi.restoreAllMocks())

  describe('meta', () => {
    it('has correct metadata', () => {
      expect(enlivCampeche.profileId).toBe('a1b2c3d4-0002-0002-0002-000000000001')
      expect(enlivCampeche.meta.companyName).toBe('Enliv')
      expect(enlivCampeche.meta.companyTaxId).toBe('49449868000162')
      expect(enlivCampeche.meta.category).toBe('electricity')
      expect(enlivCampeche.meta.status).toBe('active')
      expect(enlivCampeche.meta.capabilities.extraction).toBe(true)
      expect(enlivCampeche.meta.capabilities.apiLookup).toBe(true)
      expect(enlivCampeche.meta.capabilities.validation).toBe(true)
      expect(enlivCampeche.meta.capabilities.paymentStatus).toBe(true)
    })
  })

  describe('identify', () => {
    it('returns 0.95 for text with CNPJ and Campeche', () => {
      expect(enlivCampeche.identify('CNPJ: 49.449.868/0001-62 Campeche')).toBe(0.95)
    })

    it('returns 0.7 for text with CNPJ but no Campeche', () => {
      expect(enlivCampeche.identify('CNPJ: 49.449.868/0001-62 other area')).toBe(0.7)
    })

    it('returns null for text without Enliv CNPJ', () => {
      expect(enlivCampeche.identify('some random text')).toBeNull()
    })

    it('matches unformatted CNPJ', () => {
      expect(enlivCampeche.identify('49449868000162 campeche')).toBe(0.95)
    })
  })

  describe('extractBill', () => {
    it('extracts bill data from text', () => {
      const result = enlivCampeche.extractBill(sampleBillText)
      expect(result).not.toBeNull()
      expect(result!.billing.amountDue).toBe(21847)
      expect(result!.customer.name).toBe('Alex Amorim Anton')
    })

    it('returns null for unrecognized text', () => {
      expect(enlivCampeche.extractBill('random text')).toBeNull()
    })
  })

  describe('lookupBills', () => {
    it('returns extraction results from API', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({
          nome_cliente: 'Test User',
          debitos: [{
            id: '1',
            cadastroDistribuidora: '59069412',
            cadastroAuxDistribuidora: null,
            endereco: 'Av Campeche',
            vencimento: '2026-04-24T00:00:00.000Z',
            status: 'pendente',
            valor: 218.47,
            link: 'https://example.com',
            linha_digitavel: '74891160090666030730432263871033514260000021847',
            emv_pix: 'pix-payload',
          }],
        }), { status: 200 }),
      )

      const results = await enlivCampeche.lookupBills!('04003232909')
      expect(results).not.toBeNull()
      expect(results!).toHaveLength(1)
      expect(results![0].billing.amountDue).toBe(21847)
      expect(results![0].customer.name).toBe('Test User')
      expect(results![0].payment.pixPayload).toBe('pix-payload')
      expect(results![0].rawSource).toBe('api')
      expect(results![0].confidence.source.method).toBe('api')
    })

    it('returns null on API failure', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('network'))
      const results = await enlivCampeche.lookupBills!('04003232909')
      expect(results).toBeNull()
    })
  })

  describe('checkPaymentStatus', () => {
    it('returns payment statuses from API', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({
          nome_cliente: 'Test User',
          debitos: [{
            id: '1',
            cadastroDistribuidora: '59069412',
            vencimento: '2026-03-24T00:00:00.000Z',
            valor: 200.00,
            linha_digitavel: '123',
            emv_pix: '',
          }],
        }), { status: 200 }),
      )

      const statuses = await enlivCampeche.checkPaymentStatus!('04003232909')
      expect(statuses).not.toBeNull()
      expect(statuses!).toHaveLength(1)
      expect(statuses![0].paid).toBe(true)
      expect(statuses![0].paidAmount).toBe(20000)
      expect(statuses![0].source).toBe('provider-api')
    })

    it('returns null on API failure', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('network'))
      const statuses = await enlivCampeche.checkPaymentStatus!('04003232909')
      expect(statuses).toBeNull()
    })
  })

  describe('validateExtraction', () => {
    it('delegates to validateEnlivExtraction', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({
          nome_cliente: 'Test',
          debitos: [{
            cadastroDistribuidora: '59069412',
            vencimento: '2026-04-24T00:00:00.000Z',
            valor: 218.47,
            linha_digitavel: '74891160090666030730432263871033514260000021847',
          }],
        }), { status: 200 }),
      )

      const extraction = enlivCampeche.extractBill(sampleBillText)!
      const result = await enlivCampeche.validateExtraction!(extraction)
      expect(result).not.toBeNull()
      expect(result!.valid).toBe(true)
    })
  })
})
