'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { createSuspenseHook } from '../shared/create-hook'
import {
  bankAccountsQueryKey,
  fetchBankItems,
  type BankItemWithAccounts,
} from './shared'
import { disconnectBankItem } from './actions/disconnect-item'

export const useBankItems = createSuspenseHook<BankItemWithAccounts[], []>(
  bankAccountsQueryKey,
  fetchBankItems,
)

export function useDisconnectBankItemMutation() {
  const queryClient = useQueryClient()
  return useMutation<{ bankItemId: string }, Error, string>({
    mutationFn: async (bankItemId) => {
      const result = await disconnectBankItem(bankItemId)
      if (!result.success) {
        throw new Error(result.reason ?? 'disconnect_failed')
      }
      return { bankItemId }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: bankAccountsQueryKey() })
    },
  })
}

export type { BankItemWithAccounts, BankItem, BankAccount, BankItemStatus } from './shared'
