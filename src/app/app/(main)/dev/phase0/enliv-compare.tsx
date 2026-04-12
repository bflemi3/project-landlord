'use client'

import { useState } from 'react'
import { lookupEnlivDebitos } from '@/app/actions/phase0/enliv-lookup'
import { extractEnlivBill } from '@/app/actions/phase0/enliv-extract'
import type { EnlivResumoDebitos, EnlivBillExtraction } from '@/lib/providers/enliv/types'

type ComparisonRow = {
  field: string
  api: string
  pdf: string
  match: boolean
}

function compare(
  apiData: EnlivResumoDebitos,
  pdfData: EnlivBillExtraction,
): ComparisonRow[] {
  const apiDebito = apiData.debitos[0]
  if (!apiDebito) return []

  return [
    {
      field: 'Customer Name',
      api: apiData.nome_cliente,
      pdf: pdfData.customerName,
      match: apiData.nome_cliente === pdfData.customerName,
    },
    {
      field: 'Amount',
      api: apiDebito.valor.toFixed(2),
      pdf: pdfData.amountDue.toFixed(2),
      match: apiDebito.valor === pdfData.amountDue,
    },
    {
      field: 'Due Date',
      api: apiDebito.vencimento,
      pdf: pdfData.dueDate,
      match:
        apiDebito.vencimento.includes(pdfData.dueDate) ||
        pdfData.dueDate.includes(apiDebito.vencimento),
    },
    {
      field: 'Installation / UC',
      api: apiDebito.cadastroDistribuidora,
      pdf: pdfData.installationNumber,
      match: apiDebito.cadastroDistribuidora === pdfData.installationNumber,
    },
    {
      field: 'Barcode',
      api: apiDebito.linha_digitavel,
      pdf: pdfData.linhaDigitavel,
      match:
        apiDebito.linha_digitavel.replace(/\s/g, '') ===
        pdfData.linhaDigitavel.replace(/\s/g, ''),
    },
  ]
}

export function EnlivComparePanel() {
  const [cpf, setCpf] = useState('')
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState<ComparisonRow[]>([])
  const [error, setError] = useState<string | null>(null)

  async function handleCompare(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !cpf) return

    setLoading(true)
    setError(null)
    setRows([])

    const formData = new FormData()
    formData.append('file', file)

    const [apiResult, pdfResult] = await Promise.all([
      lookupEnlivDebitos(cpf),
      extractEnlivBill(formData),
    ])

    if (!apiResult.success) {
      setError(`API error: ${apiResult.error}`)
      setLoading(false)
      return
    }
    if (!pdfResult.success) {
      setError(`PDF error: ${pdfResult.error}`)
      setLoading(false)
      return
    }

    setRows(compare(apiResult.data, pdfResult.data))
    setLoading(false)
  }

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <p className="text-sm text-gray-500">
        Enter a CPF and upload the corresponding Enliv PDF to compare API data
        against PDF extraction.
      </p>
      <div className="flex gap-2">
        <input
          type="text"
          value={cpf}
          onChange={(e) => setCpf(e.target.value)}
          placeholder="CPF"
          className="w-48 rounded border px-3 py-2 text-sm"
        />
        <input
          type="file"
          accept=".pdf"
          onChange={handleCompare}
          disabled={!cpf}
          className="text-sm"
        />
      </div>

      {loading && <div className="text-sm text-gray-500">Comparing...</div>}

      {error && (
        <div className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {rows.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="py-2">Field</th>
              <th className="py-2">API</th>
              <th className="py-2">PDF</th>
              <th className="py-2">Match</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.field} className="border-b">
                <td className="py-2 font-medium">{row.field}</td>
                <td className="py-2 font-mono text-xs">{row.api}</td>
                <td className="py-2 font-mono text-xs">{row.pdf}</td>
                <td className="py-2">
                  {row.match ? (
                    <span className="text-green-600">Yes</span>
                  ) : (
                    <span className="font-medium text-red-600">NO</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
