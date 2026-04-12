import type { CnpjIdentification } from './types'
import { isValidCnpj } from './validate'

/**
 * Extract all CNPJs from raw text (PDF text, bill text, etc.).
 * Returns deduplicated array of unformatted CNPJ strings (digits only).
 * Validates each candidate using Brazil's check digit algorithm.
 */
export function extractCnpjsFromText(text: string): string[] {
  const formatted = text.matchAll(
    /(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})-(\d{2})/g,
  )
  const unformatted = text.matchAll(/(?<!\d)(\d{14})(?!\d)/g)

  const candidates = new Set<string>()

  for (const match of formatted) {
    candidates.add(`${match[1]}${match[2]}${match[3]}${match[4]}${match[5]}`)
  }
  for (const match of unformatted) {
    candidates.add(match[1])
  }

  return Array.from(candidates).filter(isValidCnpj)
}

async function lookupViaBrasilApi(cnpj: string): Promise<CnpjIdentification> {
  const response = await fetch(
    `https://brasilapi.com.br/api/cnpj/v1/${cnpj}`,
    { method: 'GET' },
  )

  if (!response.ok) {
    throw new Error(`BrasilAPI returned ${response.status}`)
  }

  const data = await response.json()

  return {
    cnpj: data.cnpj,
    companyName: data.nome_fantasia || data.razao_social,
    legalName: data.razao_social,
    activityCode: data.cnae_fiscal,
    activityDescription: data.cnae_fiscal_descricao,
    city: data.municipio,
    state: data.uf,
    source: 'brasilapi',
  }
}

async function lookupViaReceitaWs(cnpj: string): Promise<CnpjIdentification> {
  const response = await fetch(
    `https://receitaws.com.br/v1/cnpj/${cnpj}`,
    { method: 'GET' },
  )

  if (!response.ok) {
    throw new Error(`ReceitaWS returned ${response.status}`)
  }

  const data = await response.json()

  return {
    cnpj: data.cnpj?.replace(/[.\-/]/g, '') ?? cnpj,
    companyName: data.fantasia || data.nome,
    legalName: data.nome,
    activityCode: data.atividade_principal?.[0]?.code
      ? parseInt(data.atividade_principal[0].code.replace(/[.\-]/g, ''), 10)
      : 0,
    activityDescription: data.atividade_principal?.[0]?.text ?? 'Unknown',
    city: data.municipio,
    state: data.uf,
    source: 'receitaws',
  }
}

export async function lookupCnpj(cnpj: string): Promise<CnpjIdentification> {
  const cleanCnpj = cnpj.replace(/[.\-/]/g, '')

  try {
    return await lookupViaBrasilApi(cleanCnpj)
  } catch {
    // BrasilAPI failed, try ReceitaWS
  }

  try {
    return await lookupViaReceitaWs(cleanCnpj)
  } catch {
    // Both failed
  }

  throw new Error(
    'CNPJ lookup failed: both BrasilAPI and ReceitaWS returned errors',
  )
}
