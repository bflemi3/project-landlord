'use client'

import { useSuspenseQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export interface HomeAction {
  actionType: 'invite_tenants' | 'configure_charges' | 'pending_invite'
  propertyId: string
  propertyName: string
  detailName: string | null
  detailEmail: string | null
  detailDate: string | null
}

async function fetchHomeActions(): Promise<HomeAction[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('home_action_items')
    .select('action_type, property_id, property_name, detail_name, detail_email, detail_date')

  if (error || !data) return []

  return data.map((row) => ({
    actionType: row.action_type as HomeAction['actionType'],
    propertyId: row.property_id ?? '',
    propertyName: row.property_name ?? '',
    detailName: row.detail_name,
    detailEmail: row.detail_email,
    detailDate: row.detail_date,
  }))
}

export function useHomeActions() {
  return useSuspenseQuery({
    queryKey: ['home-actions'],
    queryFn: fetchHomeActions,
  })
}
