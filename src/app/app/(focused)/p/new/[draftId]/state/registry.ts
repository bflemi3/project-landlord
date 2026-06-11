import {
  Building2,
  CalendarDays,
  CreditCard,
  Landmark,
  Receipt,
  Users,
  type LucideIcon,
} from 'lucide-react'

export interface CheckoutSection {
  id: string
  icon: LucideIcon
  requiredInContractPath: boolean
  requiredInNoContractPath: boolean
}

/**
 * The six accordion sections that compose Step 2 of the property-creation
 * wizard, in display order.
 *
 * The `id` field drives every downstream derivation — the state machine in
 * `state/store.ts`, the TopBar progress bar, the mobile dot row, the desktop
 * summary panel, and each section component's i18n subtree lookup. Do not
 * change an id after data has been persisted for that version.
 *
 * `requiredInContractPath` and `requiredInNoContractPath` determine whether
 * the section can be skipped. `true` = required (Skip is not shown / not
 * allowed); `false` = optional (Skip advances and marks the section `skipped`).
 */
export const CHECKOUT_SECTIONS: readonly CheckoutSection[] = [
  {
    id: 'property',
    icon: Building2,
    requiredInContractPath: true,
    requiredInNoContractPath: true,
  },
  {
    id: 'rent-dates',
    icon: CalendarDays,
    requiredInContractPath: true,
    requiredInNoContractPath: false,
  },
  {
    id: 'tenants',
    icon: Users,
    requiredInContractPath: false,
    requiredInNoContractPath: false,
  },
  {
    id: 'expenses',
    icon: Receipt,
    requiredInContractPath: false,
    requiredInNoContractPath: false,
  },
  {
    id: 'tax-id',
    icon: CreditCard,
    requiredInContractPath: true,
    requiredInNoContractPath: true,
  },
  {
    id: 'bank',
    icon: Landmark,
    requiredInContractPath: false,
    requiredInNoContractPath: false,
  },
] as const satisfies readonly CheckoutSection[]

export type SectionId = (typeof CHECKOUT_SECTIONS)[number]['id']

/**
 * Path the user took out of Step 1 — either uploaded a contract (extraction
 * populated) or declared they have no contract (manual setup, more required
 * sections).
 */
export type CheckoutPath = 'contract' | 'no_contract'

/**
 * Returns the ids of sections that are required in the given path, in order.
 * Consumed by the store's skip-guard and by derivations (CTA enabled state,
 * "X remaining" counts).
 */
export function getRequiredSectionIds(path: CheckoutPath): SectionId[] {
  const key = path === 'contract' ? 'requiredInContractPath' : 'requiredInNoContractPath'
  return CHECKOUT_SECTIONS.filter((s) => s[key]).map((s) => s.id)
}

/**
 * The first section in spec order. The store initializes `activeSectionId`
 * to this value.
 */
export const FIRST_SECTION_ID: SectionId = CHECKOUT_SECTIONS[0].id
