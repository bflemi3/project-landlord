import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { fetchBankItems, type BankItemWithAccounts } from './shared'

export const getBankItems = cache(async (): Promise<BankItemWithAccounts[]> => {
  const supabase = await createClient()
  return fetchBankItems(supabase)
})
