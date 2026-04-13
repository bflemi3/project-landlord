'use client'

import { useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { fetchPluggyTransactions } from '@/app/actions/phase0/pluggy-transactions'

const PluggyConnect = dynamic(
  () => import('react-pluggy-connect').then((mod) => mod.PluggyConnect),
  { ssr: false },
)

type ConnectedItem = {
  itemId: string
  account: {
    id: string
    name: string
    type: string
    balance: number
    currencyCode: string
  }
  transactions: Array<{
    id: string
    description: string
    amount: number
    date: string
    type: string
    category: string | null
    paymentData: unknown
    merchant: unknown
  }>
}

export function PluggyConnectPanel() {
  const [connectToken, setConnectToken] = useState('')
  const [tokenLoading, setTokenLoading] = useState(false)
  const [tokenError, setTokenError] = useState<string | null>(null)
  const [showWidget, setShowWidget] = useState(false)
  const [connectedItem, setConnectedItem] = useState<ConnectedItem | null>(null)
  const [transactionsLoading, setTransactionsLoading] = useState(false)
  const [transactionsError, setTransactionsError] = useState<string | null>(null)

  const fetchToken = useCallback(async () => {
    setTokenLoading(true)
    setTokenError(null)
    try {
      const res = await fetch('/api/pluggy/connect-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientUserId: 'dev-phase0-test' }),
      })
      const data = await res.json()
      setConnectToken(data.accessToken)
    } catch (err) {
      setTokenError(err instanceof Error ? err.message : 'Failed to get connect token')
    }
    setTokenLoading(false)
  }, [])

  async function handleSuccess(itemData: { item: { id: string } }) {
    const itemId = itemData.item.id
    setShowWidget(false)
    setTransactionsLoading(true)
    setTransactionsError(null)

    const result = await fetchPluggyTransactions(itemId)

    if (result.success) {
      setConnectedItem({
        itemId,
        account: result.data.account,
        transactions: result.data.transactions,
      })
    } else {
      setTransactionsError(result.error)
    }
    setTransactionsLoading(false)
  }

  return (
    <div className="space-y-4 rounded-lg border p-4">
      {!showWidget && !connectedItem && (
        <div className="space-y-2">
          <button
            onClick={async () => {
              await fetchToken()
              setShowWidget(true)
            }}
            disabled={tokenLoading}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {tokenLoading ? 'Loading...' : 'Connect Bank Account'}
          </button>
          {tokenError && <div className="text-sm text-red-600">{tokenError}</div>}
        </div>
      )}

      {showWidget && connectToken && (
        <div>
          <PluggyConnect
            connectToken={connectToken}
            includeSandbox={true}
            onSuccess={handleSuccess}
            onError={(error) => {
              console.error('Pluggy Connect error:', error)
              setShowWidget(false)
            }}
            onClose={() => setShowWidget(false)}
          />
        </div>
      )}

      {transactionsLoading && (
        <div className="text-sm text-gray-500">Loading transactions...</div>
      )}

      {transactionsError && (
        <div className="rounded bg-red-50 p-3 text-sm text-red-700">{transactionsError}</div>
      )}

      {connectedItem && (
        <div className="space-y-3">
          <div className="text-sm">
            <span className="font-medium">Connected!</span> Item ID:{' '}
            <code className="text-xs">{connectedItem.itemId}</code>
          </div>

          <div className="rounded bg-muted p-3 text-sm">
            <div className="font-medium">
              {connectedItem.account.name} ({connectedItem.account.type})
            </div>
            <div className="text-gray-500">
              Balance: {connectedItem.account.currencyCode}{' '}
              {connectedItem.account.balance?.toFixed(2)}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium">
              Transactions ({connectedItem.transactions.length})
            </h4>
            <div className="mt-1 max-h-96 space-y-1 overflow-auto">
              {connectedItem.transactions.map((t) => (
                <div key={t.id} className="flex justify-between rounded border px-3 py-2 text-sm">
                  <div>
                    <div>{t.description}</div>
                    <div className="text-xs text-gray-400">
                      {t.date} | {t.category ?? 'uncategorized'}
                    </div>
                  </div>
                  <div className={`font-mono ${t.type === 'DEBIT' ? 'text-red-600' : 'text-green-600'}`}>
                    {t.type === 'DEBIT' ? '-' : '+'}R$ {Math.abs(t.amount).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <details>
            <summary className="cursor-pointer text-xs text-gray-400">Raw transaction data</summary>
            <pre className="mt-1 max-h-64 overflow-auto rounded bg-muted p-2 text-xs">
              {JSON.stringify(connectedItem, null, 2)}
            </pre>
          </details>

          <button
            onClick={() => {
              setConnectedItem(null)
              setConnectToken('')
            }}
            className="text-sm text-blue-600 underline"
          >
            Connect another account
          </button>
        </div>
      )}
    </div>
  )
}
