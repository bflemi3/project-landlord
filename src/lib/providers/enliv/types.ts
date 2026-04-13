export interface EnlivDebito {
  id: string
  cadastroDistribuidora: string
  cadastroAuxDistribuidora: string | null
  endereco: string
  vencimento: string // ISO 8601 date
  status: string // e.g. "PENDENTE"
  valor: number
  link: string // URL to PDF report
  linha_digitavel: string
  emv_pix: string // PIX QR code payload
}

export interface EnlivResumoDebitos {
  nome_cliente: string
  debitos: EnlivDebito[]
}

export interface EnlivBillExtraction {
  providerName: string
  providerCnpj: string
  customerName: string
  customerCpf: string
  installationNumber: string
  address: string
  referenceMonth: string
  issueDate: string
  dueDate: string
  consumptionKwh: number
  amountDue: number
  linhaDigitavel: string
}
