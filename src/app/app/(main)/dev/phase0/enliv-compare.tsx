'use client'

import { useState } from 'react'
import { lookupEnlivDebitos } from '@/app/actions/phase0/enliv-lookup'
import { extractEnlivBill } from '@/app/actions/phase0/enliv-extract'
import type { EnlivDebitoComparison } from '@/lib/providers/enliv/compare'
import { compareEnlivApiVsPdf } from '@/lib/providers/enliv/compare'

export function EnlivComparePanel() {
  const [cpf, setCpf] = useState('')
  const [loading, setLoading] = useState(false)
  const [comparisons, setComparisons] = useState<EnlivDebitoComparison[]>([])
  const [error, setError] = useState<string | null>(null)

  async function handleCompare(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !cpf) return

    setLoading(true)
    setError(null)
    setComparisons([])

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

    setComparisons(compareEnlivApiVsPdf(apiResult.data, pdfResult.data))
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

      {comparisons.length > 0 && (
        <div className="space-y-4">
          <div className="text-sm text-gray-500">
            {comparisons.length} debito(s) from API compared against PDF
          </div>
          {comparisons.map((comp) => (
            <div key={comp.debitoIndex} className="space-y-2">
              <div className="text-sm font-medium">
                Debito {comp.debitoIndex + 1} — UC: {comp.installationNumber}
                {comp.barcodeMatch ? (
                  <span className="ml-2 rounded bg-green-100 px-2 py-0.5 text-xs text-green-700">
                    barcode match — this is the PDF bill
                  </span>
                ) : (
                  <span className="ml-2 rounded bg-yellow-100 px-2 py-0.5 text-xs text-yellow-700">
                    different bill
                  </span>
                )}
              </div>
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
                  {comp.fields.map((row) => (
                    <tr key={row.field} className="border-b">
                      <td className="py-2 font-medium">{row.field}</td>
                      <td className="py-2 font-mono text-xs break-all">{row.api}</td>
                      <td className="py-2 font-mono text-xs break-all">{row.pdf}</td>
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
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
