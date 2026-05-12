import { Building2, Home, Briefcase, MoreHorizontal, type LucideIcon } from 'lucide-react'

import type { Database } from '@/lib/types/database'

type PropertyType = Database['public']['Enums']['property_type']

export const PROPERTY_TYPE_ICONS: Record<PropertyType, LucideIcon> = {
  apartment: Building2,
  house: Home,
  commercial: Briefcase,
  other: MoreHorizontal,
}
