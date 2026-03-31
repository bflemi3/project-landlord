/**
 * Setup progress for a property's onboarding checklist.
 * Derived from membership data (tenant count, charge count, etc.)
 */
export interface PropertySetupProgress {
  propertyCreated: boolean
  tenantsInvited: boolean
  tenantsAccepted: boolean
  chargesConfigured: boolean
  firstStatementPublished: boolean
}

export interface PendingInvite {
  email: string
  name: string | null
  sentAt: string // ISO date
}

export interface UrgentAction {
  type: 'overdue_payment' | 'payment_claim' | 'dispute' | 'bill_review'
  propertyId: string
  propertyName: string
  title: string
  description: string
}

export type PropertyStatus = 'healthy' | 'attention' | 'overdue'

export interface PropertyOperationalData {
  status: PropertyStatus
  nextDueDate: string | null // ISO date
  billingCycle: string | null // e.g., "March 2026"
  unpaidCount: number
  totalDueMinor: number // in minor units
  expectedRevenueMinor: number // total expected this month (fixed + ingested variable)
  pendingBillCount: number // variable charges without bills yet
}
