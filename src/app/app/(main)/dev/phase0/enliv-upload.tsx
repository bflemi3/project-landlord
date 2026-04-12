'use client'

import { useState } from 'react'
import { extractEnlivBill } from '@/app/actions/phase0/enliv-extract'
import type { EnlivBillExtraction } from '@/lib/providers/enliv/types'

export function EnlivUploadPanel() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    data: EnlivBillExtraction
    rawText: string
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    setError(null)
    setResult(null)

    const formData = new FormData()
    formData.append('file', file)

    const response = await extractEnlivBill(formData)

    if (response.success) {
      setResult({ data: response.data, rawText: response.rawText })
    } else {
      setError(response.error)
    }
    setLoading(false)
  }

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div>
        <input type="file" accept=".pdf" onChange={handleUpload} className="text-sm" />
        {loading && <span className="ml-2 text-sm text-gray-500">Extracting...</span>}
      </div>

      {error && (
        <div className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {result && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Extracted Fields</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><span className="text-gray-500">Provider:</span> {result.data.providerName}</div>
            <div><span className="text-gray-500">CNPJ:</span> {result.data.providerCnpj}</div>
            <div><span className="text-gray-500">Customer:</span> {result.data.customerName}</div>
            <div><span className="text-gray-500">CPF:</span> {result.data.customerCpf}</div>
            <div><span className="text-gray-500">Installation:</span> {result.data.installationNumber}</div>
            <div><span className="text-gray-500">Reference:</span> {result.data.referenceMonth}</div>
            <div><span className="text-gray-500">Due Date:</span> {result.data.dueDate}</div>
            <div><span className="text-gray-500">Consumption:</span> {result.data.consumptionKwh} kWh</div>
            <div className="col-span-2">
              <span className="text-gray-500">Amount Due:</span>{' '}
              <span className="font-mono font-medium">R$ {result.data.amountDue.toFixed(2)}</span>
            </div>
          </div>

          {result.data.lineItems.length > 0 && (
            <div>
              <h4 className="text-sm font-medium">Line Items</h4>
              <div className="mt-1 space-y-1">
                {result.data.lineItems.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span>{item.description}</span>
                    <span className="font-mono">R$ {item.value.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <details>
            <summary className="cursor-pointer text-xs text-gray-400">Raw PDF text</summary>
            <pre className="mt-1 max-h-64 overflow-auto whitespace-pre-wrap rounded bg-gray-50 p-2 text-xs">
              {result.rawText}
            </pre>
          </details>

          <details>
            <summary className="cursor-pointer text-xs text-gray-400">Extracted JSON</summary>
            <pre className="mt-1 max-h-64 overflow-auto rounded bg-gray-50 p-2 text-xs">
              {JSON.stringify(result.data, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  )
}
