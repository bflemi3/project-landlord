import type { EnlivResumoDebitos } from './types'

const ENLIV_API_BASE =
  'https://enliv-api-operacional-e8a27cc79cd8.herokuapp.com'

function stripCpfFormatting(cpf: string): string {
  return cpf.replace(/[.\-/]/g, '')
}

export async function fetchEnlivDebitos(
  cpf: string,
): Promise<EnlivResumoDebitos> {
  const cleanCpf = stripCpfFormatting(cpf)
  const url = `${ENLIV_API_BASE}/v1/cobrancas/cliente/${cleanCpf}/resumo-debitos`

  const response = await fetch(url, { method: 'GET' })

  if (!response.ok) {
    throw new Error(`Enliv API returned ${response.status}`)
  }

  return response.json()
}
