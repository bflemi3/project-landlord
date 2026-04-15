import { externalFetch } from '@/lib/external/call'

const ENLIV_API_BASE = 'https://enliv-api-operacional-e8a27cc79cd8.herokuapp.com'

export interface EnlivDebito {
  id: string
  cadastroDistribuidora: string
  cadastroAuxDistribuidora: string | null
  endereco: string
  vencimento: string
  status: string
  valor: number
  link: string
  linha_digitavel: string
  emv_pix: string
}

export interface EnlivResumoDebitos {
  nome_cliente: string
  debitos: EnlivDebito[]
}

function stripFormatting(doc: string): string {
  return doc.replace(/[.\-/]/g, '')
}

export async function fetchEnlivDebitos(document: string): Promise<EnlivResumoDebitos> {
  const clean = stripFormatting(document)
  const result = await externalFetch<EnlivResumoDebitos>({
    service: 'enliv-api',
    operation: 'fetch-debitos',
    url: `${ENLIV_API_BASE}/v1/cobrancas/cliente/${clean}/resumo-debitos`,
  })

  if (!result.success || !result.data) {
    throw new Error(result.error?.message ?? 'Enliv API fetch-debitos failed')
  }

  return result.data
}

export async function fetchEnlivPagas(document: string, page = 1): Promise<EnlivResumoDebitos> {
  const clean = stripFormatting(document)
  const result = await externalFetch<EnlivResumoDebitos>({
    service: 'enliv-api',
    operation: 'fetch-pagas',
    url: `${ENLIV_API_BASE}/v1/cobrancas/cliente/${clean}/resumo-pagas?page=${page}`,
  })

  if (!result.success || !result.data) {
    throw new Error(result.error?.message ?? 'Enliv API fetch-pagas failed')
  }

  return result.data
}
