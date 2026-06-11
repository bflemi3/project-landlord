import { cache } from 'react'

import { createClient } from '@/lib/supabase/server'

import { fetchPropertyContractStatus, type ContractStatus } from './shared'

export const getPropertyContractStatus = cache(
  async (propertyId: string): Promise<ContractStatus> => {
    const supabase = await createClient()
    return fetchPropertyContractStatus(supabase, propertyId)
  },
)
