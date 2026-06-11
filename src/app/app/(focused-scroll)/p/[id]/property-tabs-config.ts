import { FileText, MessageSquare, Receipt, TrendingUp, Wallet, type LucideIcon } from 'lucide-react'

import { type PropertyTab } from './state/store'

// Single source of truth for per-tab chrome. Labels are i18n keys read as
// `property.tabs.<id>`; the icon drives the mobile FloatingBar (desktop tabs are
// text-only). Each role view passes its own ordered subset of ids below.
export const PROPERTY_TAB_META: Record<PropertyTab, { icon: LucideIcon }> = {
  revenue: { icon: TrendingUp },
  rent: { icon: Wallet },
  bills: { icon: Receipt },
  contract: { icon: FileText },
  messages: { icon: MessageSquare },
}

export const LANDLORD_TAB_IDS = [
  'revenue',
  'bills',
  'contract',
  'messages',
] as const satisfies readonly PropertyTab[]

export const TENANT_TAB_IDS = [
  'rent',
  'bills',
  'contract',
  'messages',
] as const satisfies readonly PropertyTab[]
