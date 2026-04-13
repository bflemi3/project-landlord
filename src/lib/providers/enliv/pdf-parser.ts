import type { EnlivBillExtraction } from './types'

/**
 * Parse raw text extracted from an Enliv electricity bill PDF.
 * The input is the string output of pdf-parse; this function uses
 * regex patterns specific to Enliv's bill layout to extract structured data.
 */
export function parseEnlivBillText(text: string): EnlivBillExtraction {
  const providerCnpj = extractField(text, /CNPJ:\s*(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/) ?? ''
  const customerName = extractField(text, /Cliente:\s*\n(.+)/) ?? ''
  const customerCpf = extractField(text, /CNPJ\/CPF:\s*\n([\d.\-\/]+)/) ?? ''
  const installationNumber = extractField(text, /Número da Instalação:\s*\n(\d+)/) ?? ''

  const address = extractAddress(text)

  const referenceMonth = extractField(text, /Mês de Referência:\s*\n(\S+)/) ?? ''
  const issueDate = extractField(text, /Data de Emissão:\s*\n(\d{2}\/\d{2}\/\d{4})/) ?? ''
  const dueDate = extractField(text, /Vencimento:\s*\n(\d{2}\/\d{2}\/\d{4})/) ?? ''

  const consumptionMatch = text.match(/Consumo Total do Mês:\s*(\d+)\s*kWh/)
  const consumptionKwh = consumptionMatch ? parseInt(consumptionMatch[1], 10) : 0

  const amountMatch = text.match(/Valor a pagar:\s*\nR\$\s*([\d.,]+)/)
  const amountDue = amountMatch ? parseBRL(amountMatch[1]) : 0

  const linhaDigitavel = extractField(text, /(\d{5}\.\d{5}\s+\d{5}\.\d{6}\s+\d{5}\.\d{6}\s+\d\s+\d{14})/) ?? ''

  return {
    providerName: 'Enliv',
    providerCnpj,
    customerName,
    customerCpf,
    installationNumber,
    address,
    referenceMonth,
    issueDate,
    dueDate,
    consumptionKwh,
    amountDue,
    linhaDigitavel,
  }
}

function extractField(text: string, pattern: RegExp): string | null {
  const match = text.match(pattern)
  return match ? match[1].trim() : null
}

function extractAddress(text: string): string {
  const match = text.match(/Endereço:\s*\n([\s\S]*?)(?=\nCNPJ\/CPF:)/)
  if (!match) return ''
  return match[1].replace(/\n/g, ' ').replace(/\s+/g, ' ').trim()
}

/** Parse Brazilian currency string: "223,15" → 223.15, "1.234,56" → 1234.56 */
function parseBRL(value: string): number {
  const normalized = value.replace(/\./g, '').replace(',', '.')
  return parseFloat(normalized)
}

