import type { Database } from '@/lib/types/database'
import type { TypedSupabaseClient } from '@/lib/supabase/types'

export type BankItem = Database['public']['Tables']['bank_items']['Row']
export type BankAccount = Database['public']['Tables']['bank_accounts']['Row']
export type BankItemStatus = Database['public']['Enums']['bank_item_status']

export type BankItemWithAccounts = BankItem & {
  accounts: BankAccount[]
}

export async function fetchBankItems(
  supabase: TypedSupabaseClient,
): Promise<BankItemWithAccounts[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('bank_items')
    .select(
      `
        id, user_id, pluggy_item_id, institution_id, institution_name,
        status, connected_at, disconnected_at, created_at, updated_at,
        accounts:bank_accounts (
          id, bank_item_id, user_id, pluggy_account_id, account_type,
          account_subtype, name, masked_number, currency_code, created_at
        )
      `,
    )
    .is('disconnected_at', null)
    .order('connected_at', { ascending: false })

  if (error || !data) return []
  return data as BankItemWithAccounts[]
}

export const bankAccountsQueryKey = () => ['bank-accounts'] as const
