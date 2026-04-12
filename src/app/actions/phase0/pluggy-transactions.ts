'use server'

import { getPluggyClient } from '@/lib/pluggy/client'

export async function fetchPluggyTransactions(itemId: string) {
  try {
    const pluggy = getPluggyClient()

    const accounts = await pluggy.fetchAccounts(itemId)
    if (accounts.results.length === 0) {
      return { success: false as const, error: 'No accounts found for this item' }
    }

    const account = accounts.results[0]
    const transactions = await pluggy.fetchTransactions(account.id)

    return {
      success: true as const,
      data: {
        account: {
          id: account.id,
          name: account.name,
          type: account.type,
          balance: account.balance,
          currencyCode: account.currencyCode,
        },
        transactions: transactions.results.map((t) => ({
          id: t.id,
          description: t.description,
          amount: t.amount,
          date: t.date,
          type: t.type,
          category: t.category,
          paymentData: t.paymentData,
          merchant: t.merchant,
        })),
      },
    }
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'Failed to fetch transactions',
    }
  }
}
