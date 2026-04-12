export interface CnpjLookupResult {
  cnpj: string
  razao_social: string // Legal name
  nome_fantasia: string | null // Trade/brand name
  situacao_cadastral: string // e.g. "ATIVA"
  logradouro: string
  numero: string
  complemento: string
  bairro: string
  municipio: string
  uf: string
  cep: string
  cnae_fiscal: number // Primary activity code
  cnae_fiscal_descricao: string // e.g. "Distribuição de energia elétrica"
  telefone: string
  email: string | null
}

export interface CnpjIdentification {
  cnpj: string
  companyName: string // nome_fantasia || razao_social
  legalName: string
  activityCode: number
  activityDescription: string
  city: string
  state: string
  source: 'brasilapi' | 'receitaws'
}
