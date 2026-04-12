'use client'

import { useState } from 'react'
import { lookupEnlivDebitos } from '@/app/actions/phase0/enliv-lookup'
import type { EnlivResumoDebitos } from '@/lib/providers/enliv/types'

export function EnlivLookupPanel() {
  const [cpf, setCpf] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<EnlivResumoDebitos | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleLookup() {
    setLoading(true)
    setError(null)
    setResult(null)

    const response = await lookupEnlivDebitos(cpf)

    if (response.success) {
      setResult(response.data)
    } else {
      setError(response.error)
    }
    setLoading(false)
  }

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="flex gap-2">
        <input
          type="text"
          value={cpf}
          onChange={(e) => setCpf(e.target.value)}
          placeholder="Enter CPF (e.g. 04003232909)"
          className="flex-1 rounded border px-3 py-2 text-sm"
        />
        <button
          onClick={handleLookup}
          disabled={loading || !cpf}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? 'Looking up...' : 'Lookup'}
        </button>
      </div>

      {error && (
        <div className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {result && (
        <div className="space-y-3">
          <div className="text-sm font-medium">Customer: {result.nome_cliente}</div>
          <div className="text-sm text-gray-500">{result.debitos.length} open debt(s)</div>
          {result.debitos.map((d) => (
            <div key={d.id} className="rounded border p-3 text-sm">
              <div className="flex justify-between">
                <span>Due: {d.vencimento}</span>
                <span className="font-mono font-medium">R$ {d.valor.toFixed(2)}</span>
              </div>
              <div className="mt-1 text-gray-500">
                Status: {d.status} | UC: {d.cadastroDistribuidora}
              </div>
              <div className="mt-1 break-all font-mono text-xs text-gray-400">
                {d.linha_digitavel}
              </div>
            </div>
          ))}
          <details className="mt-2">
            <summary className="cursor-pointer text-xs text-gray-400">Raw JSON</summary>
            <pre className="mt-1 max-h-64 overflow-auto rounded bg-gray-50 p-2 text-xs">
              {JSON.stringify(result, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  )
}
