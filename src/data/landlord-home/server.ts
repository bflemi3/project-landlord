import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getUserId } from '@/lib/supabase/get-user-id'
import {
  fetchLandlordHomeData,
  type LandlordHomePropertyCard,
  type LandlordHomeRevenueSummary,
} from './shared'

const getLandlordHomeData = cache(async () => {
  const userId = await getUserId()
  if (!userId) return { cards: [], summary: emptySummary() }
  const supabase = await createClient()
  return fetchLandlordHomeData(supabase, userId)
})

export const getLandlordHomeRevenueSummary = cache(
  async (): Promise<LandlordHomeRevenueSummary> => {
    const { summary } = await getLandlordHomeData()
    return summary
  },
)

export const getLandlordHomePropertyCards = cache(
  async (): Promise<LandlordHomePropertyCard[]> => {
    const { cards } = await getLandlordHomeData()
    return cards.map((card): LandlordHomePropertyCard => ({
      property_id: card.property_id,
      property_name: card.property_name,
      property_address: card.property_address,
      property_type: card.property_type,
      earned_minor: card.earned_minor,
      monthly_minor: card.monthly_minor,
      currency: card.currency,
      end_date: card.end_date,
      end_state: card.end_state,
      days_until_end: card.days_until_end,
    }))
  },
)

function emptySummary(): LandlordHomeRevenueSummary {
  return { total_earned_minor: {}, total_monthly_minor: {}, ending_soon: [] }
}
