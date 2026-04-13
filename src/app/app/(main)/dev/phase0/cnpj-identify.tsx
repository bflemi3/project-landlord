'use client'

import { useState } from 'react'
import { identifyBillProvider } from '@/app/actions/phase0/cnpj-identify'
import type { CnpjIdentification } from '@/lib/cnpj/types'

type IdentifyResult = {
  cnpjsFound: string[]
  lookups: CnpjIdentification[]
  errors: string[]
}

export function CnpjIdentifyPanel() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    data: IdentifyResult
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

    const response = await identifyBillProvider(formData)

    if (response.success) {
      setResult({ data: response.data, rawText: response.rawText ?? '' })
    } else {
      setError(response.error)
    }
    setLoading(false)
  }

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <p className="text-sm text-gray-500">
        Upload any bill PDF. We&apos;ll extract CNPJs, look up each company via
        BrasilAPI (with ReceitaWS fallback), and identify the provider.
      </p>
      <div>
        <input type="file" accept=".pdf" onChange={handleUpload} className="text-sm" />
        {loading && <span className="ml-2 text-sm text-gray-500">Identifying...</span>}
      </div>

      {error && (
        <div className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {result && (
        <div className="space-y-3">
          <div className="text-sm">
            <span className="font-medium">{result.data.cnpjsFound.length} CNPJ(s) found:</span>{' '}
            {result.data.cnpjsFound.join(', ')}
          </div>

          {result.data.lookups.map((lookup) => (
            <div key={lookup.cnpj} className="rounded border p-3 text-sm">
              <div className="font-medium">{lookup.companyName}</div>
              <div className="text-gray-500">{lookup.legalName}</div>
              <div className="mt-1 grid grid-cols-2 gap-1 text-xs text-gray-500">
                <div>CNPJ: {lookup.cnpj}</div>
                <div>Source: {lookup.source}</div>
                <div>Activity: {lookup.activityDescription}</div>
                <div>CNAE: {lookup.activityCode}</div>
                <div>Location: {lookup.city}, {lookup.state}</div>
              </div>
            </div>
          ))}

          {result.data.errors.length > 0 && (
            <div className="rounded bg-yellow-50 p-3 text-sm text-yellow-700">
              <div className="font-medium">Lookup errors:</div>
              {result.data.errors.map((err, i) => (
                <div key={i}>{err}</div>
              ))}
            </div>
          )}

          <details>
            <summary className="cursor-pointer text-xs text-gray-400">Raw PDF text</summary>
            <pre className="mt-1 max-h-64 overflow-auto whitespace-pre-wrap rounded bg-muted p-2 text-xs">
              {result.rawText}
            </pre>
          </details>
        </div>
      )}
    </div>
  )
}
