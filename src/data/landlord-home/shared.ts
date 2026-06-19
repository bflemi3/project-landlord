import type { Database } from '@/lib/types/database'
import type { TypedSupabaseClient } from '@/lib/supabase/types'

type PropertyType = Database['public']['Enums']['property_type']

export type PropertyAddress = {
  street: string | null
  number: string | null
  complement: string | null
  neighborhood: string | null
  city: string | null
  state: string | null
  postal_code: string | null
  country_code: string
}

export type LeaseEndState = 'far' | 'ending-soon' | 'ending-imminent' | 'ended' | 'none'

export type LandlordHomePropertyCard = {
  property_id: string
  property_name: string
  property_address: PropertyAddress
  property_type: PropertyType | null
  earned_minor: number | null
  monthly_minor: number | null
  currency: string
  end_date: string | null
  end_state: LeaseEndState
  days_until_end: number | null
}

export type LandlordHomeEndingSoon = {
  property_id: string
  property_name: string
  end_date: string
  days_until_end: number
}

export type LandlordHomeRevenueSummary = {
  total_earned_minor: Record<string, number>
  total_monthly_minor: Record<string, number>
  ending_soon: LandlordHomeEndingSoon[]
}

export const ENDING_SOON_WINDOW_DAYS = 60
export const ENDING_IMMINENT_WINDOW_DAYS = 14

type RentRow = {
  amount_minor: number
  currency: string
  start_date: string | null
  end_date: string | null
}

type UnitWithRent = {
  id: string
  deleted_at: string | null
  rent: RentRow[] | null
}

type PropertyRowWithUnits = {
  id: string
  name: string
  street: string | null
  number: string | null
  complement: string | null
  neighborhood: string | null
  city: string | null
  state: string | null
  postal_code: string | null
  country_code: string
  property_type: PropertyType | null
  units: UnitWithRent[] | null
}

// ---------- date math ----------

export function startOfDayUTC(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

export function parseISODate(iso: string): Date {
  // Treat YYYY-MM-DD as UTC midnight so day comparisons don't drift by timezone.
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1))
}

export function monthsBetween(start: Date, end: Date): number {
  if (end.getTime() <= start.getTime()) return 0
  const yearDiff = end.getUTCFullYear() - start.getUTCFullYear()
  const monthDiff = end.getUTCMonth() - start.getUTCMonth()
  let months = yearDiff * 12 + monthDiff
  if (end.getUTCDate() < start.getUTCDate()) months -= 1
  return Math.max(0, months)
}

export function daysUntil(target: Date, now: Date): number {
  const ms = startOfDayUTC(target).getTime() - startOfDayUTC(now).getTime()
  return Math.floor(ms / (1000 * 60 * 60 * 24))
}

export function leaseEndStateForDate(endDate: string | null, now: Date): LeaseEndState {
  if (!endDate) return 'none'
  const days = daysUntil(parseISODate(endDate), now)
  if (days < 0) return 'ended'
  if (days <= ENDING_IMMINENT_WINDOW_DAYS) return 'ending-imminent'
  if (days <= ENDING_SOON_WINDOW_DAYS) return 'ending-soon'
  return 'far'
}

// ---------- per-rent calculations ----------

type RentEarnedInput = {
  amount_minor: number
  start_date: string | null
  end_date: string | null
}

/**
 * Earned contribution for a single rent row. `null` means "do not count toward
 * a numeric total" (no start_date, future start_date, or soft-deleted upstream).
 */
export function rentEarnedMinor(rent: RentEarnedInput, now: Date): number | null {
  if (!rent.start_date) return null
  const start = parseISODate(rent.start_date)
  if (start.getTime() > now.getTime()) return null

  const endCap = rent.end_date ? parseISODate(rent.end_date) : null
  const upperBound = endCap && endCap.getTime() < now.getTime() ? endCap : now
  const months = monthsBetween(start, upperBound)
  return months * rent.amount_minor
}

type RentActiveInput = {
  amount_minor: number
  start_date: string | null
  end_date: string | null
}

export function rentIsActiveNow(rent: RentActiveInput, now: Date): boolean {
  if (rent.start_date) {
    const start = parseISODate(rent.start_date)
    if (start.getTime() > now.getTime()) return false
  }
  if (rent.end_date) {
    const end = parseISODate(rent.end_date)
    if (end.getTime() < startOfDayUTC(now).getTime()) return false
  }
  return true
}

// ---------- aggregations ----------

export type ComputedCard = LandlordHomePropertyCard & {
  // The latest end_date across this property's rent rows, kept separately so
  // the summary fetcher can derive "ending soon" without re-querying.
  _latest_end_date: string | null
}

export function computeCardForProperty(property: PropertyRowWithUnits, now: Date): ComputedCard {
  const units = property.units ?? []
  const activeRents: RentRow[] = []
  const earnedRents: RentRow[] = []
  for (const unit of units) {
    if (unit.deleted_at) continue
    const rents = unit.rent ?? []
    for (const rent of rents) {
      // soft-delete on rent is handled in the SQL filter; double-check is cheap.
      if ((rent as RentRow & { deleted_at?: string | null }).deleted_at) continue
      earnedRents.push(rent)
      if (rentIsActiveNow(rent, now)) {
        activeRents.push(rent)
      }
    }
  }

  let monthlyMinor: number | null = null
  let currency = 'BRL'
  for (const rent of activeRents) {
    monthlyMinor = (monthlyMinor ?? 0) + rent.amount_minor
    currency = rent.currency
  }

  let earnedMinor: number | null = null
  let anyEarnedContrib = false
  for (const rent of earnedRents) {
    const contrib = rentEarnedMinor(rent, now)
    if (contrib === null) continue
    anyEarnedContrib = true
    earnedMinor = (earnedMinor ?? 0) + contrib
    currency = rent.currency
  }
  if (!anyEarnedContrib) earnedMinor = null

  let latestEndDate: string | null = null
  for (const rent of activeRents) {
    if (!rent.end_date) continue
    if (latestEndDate === null || rent.end_date > latestEndDate) {
      latestEndDate = rent.end_date
    }
  }
  // When no active rent, surface any past end date so the card can render
  // "Lease ended" treatment.
  if (latestEndDate === null) {
    for (const rent of earnedRents) {
      if (!rent.end_date) continue
      if (latestEndDate === null || rent.end_date > latestEndDate) {
        latestEndDate = rent.end_date
      }
    }
  }

  const endState = leaseEndStateForDate(latestEndDate, now)
  const daysUntilEnd = latestEndDate ? daysUntil(parseISODate(latestEndDate), now) : null

  return {
    property_id: property.id,
    property_name: property.name,
    property_address: {
      street: property.street,
      number: property.number,
      complement: property.complement,
      neighborhood: property.neighborhood,
      city: property.city,
      state: property.state,
      postal_code: property.postal_code,
      country_code: property.country_code,
    },
    property_type: property.property_type,
    earned_minor: earnedMinor,
    monthly_minor: monthlyMinor,
    currency,
    end_date: latestEndDate,
    end_state: endState,
    days_until_end: daysUntilEnd,
    _latest_end_date: latestEndDate,
  }
}

export function summarizeCards(cards: ComputedCard[], now: Date): LandlordHomeRevenueSummary {
  const total_earned_minor: Record<string, number> = {}
  const total_monthly_minor: Record<string, number> = {}
  const ending_soon: LandlordHomeEndingSoon[] = []

  for (const card of cards) {
    if (card.earned_minor !== null) {
      total_earned_minor[card.currency] =
        (total_earned_minor[card.currency] ?? 0) + card.earned_minor
    }
    if (card.monthly_minor !== null) {
      total_monthly_minor[card.currency] =
        (total_monthly_minor[card.currency] ?? 0) + card.monthly_minor
    }
    if (card._latest_end_date) {
      const days = daysUntil(parseISODate(card._latest_end_date), now)
      if (days >= 0 && days <= ENDING_SOON_WINDOW_DAYS) {
        ending_soon.push({
          property_id: card.property_id,
          property_name: card.property_name,
          end_date: card._latest_end_date,
          days_until_end: days,
        })
      }
    }
  }

  ending_soon.sort((a, b) => a.days_until_end - b.days_until_end)

  return { total_earned_minor, total_monthly_minor, ending_soon }
}

// ---------- fetcher ----------

/**
 * One query that materializes every property the user has a landlord
 * membership on, plus the property's units and active rent rows. Read-side
 * RLS scopes by `is_property_landlord` / membership; we add `eq` filters as
 * defense in depth and to avoid pulling tenant-only memberships.
 */
export async function fetchLandlordHomeData(
  supabase: TypedSupabaseClient,
  userId: string,
): Promise<{ cards: ComputedCard[]; summary: LandlordHomeRevenueSummary }> {
  const { data, error } = await supabase
    .from('memberships')
    .select(
      `
      role,
      property:properties!inner (
        id,
        name,
        street,
        number,
        complement,
        neighborhood,
        city,
        state,
        postal_code,
        country_code,
        property_type,
        deleted_at,
        units (
          id,
          deleted_at,
          rent (
            amount_minor,
            currency,
            start_date,
            end_date,
            deleted_at
          )
        )
      )
    `,
    )
    .eq('user_id', userId)
    .eq('role', 'landlord')
    .is('deleted_at', null)

  const now = new Date()

  if (error || !data) return { cards: [], summary: summarizeCards([], now) }

  const seen = new Set<string>()
  const cards: ComputedCard[] = []
  for (const row of data) {
    const property = row.property as unknown as
      | (PropertyRowWithUnits & { deleted_at: string | null })
      | null
    if (!property) continue
    if (property.deleted_at) continue
    if (seen.has(property.id)) continue
    seen.add(property.id)

    const cleanedUnits = (property.units ?? [])
      .filter((u) => !u.deleted_at)
      .map((u) => ({
        ...u,
        rent: (u.rent ?? []).filter(
          (r) => !(r as RentRow & { deleted_at?: string | null }).deleted_at,
        ),
      }))

    cards.push(computeCardForProperty({ ...property, units: cleanedUnits }, now))
  }

  cards.sort((a, b) => a.property_name.localeCompare(b.property_name))

  return { cards, summary: summarizeCards(cards, now) }
}

export const landlordHomeRevenueSummaryQueryKey = () =>
  ['landlord-home', 'revenue-summary'] as const

export const landlordHomePropertyCardsQueryKey = () => ['landlord-home', 'property-cards'] as const
