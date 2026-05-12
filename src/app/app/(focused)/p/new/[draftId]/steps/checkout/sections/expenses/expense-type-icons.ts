// Transient location — task #1 (Centralize expense type icon mapping) moves
// this to a shared spot consumed by every surface that renders an expense
// (selector, row trigger, ledger, summary cards, etc.). Keeping it local for
// now so the wizard's selector + row can share one source of truth without
// the broader-codebase audit blocking Phase 1B.

import {
  Building2,
  Droplets,
  Flame,
  MoreHorizontal,
  Receipt,
  Shield,
  Trash2,
  Tv,
  Waves,
  Wifi,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react'

import type { ExpenseType } from './schemas'

export const EXPENSE_TYPE_ICONS: Record<ExpenseType, LucideIcon> = {
  electricity: Zap,
  water: Droplets,
  gas: Flame,
  internet: Wifi,
  condo: Building2,
  trash: Trash2,
  sewer: Waves,
  cable: Tv,
  insurance: Shield,
  maintenance: Wrench,
  other: MoreHorizontal,
}

/** Fallback icon used when an expense row has no type yet. */
export const EXPENSE_TYPE_FALLBACK_ICON: LucideIcon = Receipt
