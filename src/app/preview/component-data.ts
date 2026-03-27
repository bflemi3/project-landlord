import type { MembershipWithProperty } from '@/lib/hooks/use-memberships'
import type { PropertySetupProgress, PendingInvite, PropertyOperationalData, UrgentAction } from './mock-data'

// =============================================================================
// Property card variants
// =============================================================================

const MEMBERSHIP_SUN_CLUB: MembershipWithProperty = {
  id: 'mem-1',
  role: 'landlord',
  property: { id: 'prop-1', name: 'Sun Club 7127', street: 'Avenida Campeche', number: '533', city: 'Florianópolis', state: 'SC' },
}

const MEMBERSHIP_RUA_AUGUSTA: MembershipWithProperty = {
  id: 'mem-2',
  role: 'landlord',
  property: { id: 'prop-2', name: 'Rua Augusta 123', street: 'Rua Augusta', number: '123', city: 'São Paulo', state: 'SP' },
}

const MEMBERSHIP_LONG_NAME: MembershipWithProperty = {
  id: 'mem-3',
  role: 'landlord',
  property: { id: 'prop-3', name: 'Residencial Parque das Flores Bloco B', street: 'Rua das Flores', number: '45', city: 'Rio de Janeiro', state: 'RJ' },
}

// -- Operating variants --

export interface OperatingVariant {
  label: string
  membership: MembershipWithProperty
  opData: PropertyOperationalData
}

export const OPERATING_VARIANTS: OperatingVariant[] = [
  {
    label: 'Healthy — all paid',
    membership: MEMBERSHIP_SUN_CLUB,
    opData: { status: 'healthy', nextDueDate: '2026-04-10', billingCycle: 'March 2026', unpaidCount: 0, totalDueMinor: 0, expectedRevenueMinor: 485000, pendingBillCount: 0 },
  },
  {
    label: 'Attention — bills pending',
    membership: MEMBERSHIP_RUA_AUGUSTA,
    opData: { status: 'attention', nextDueDate: '2026-04-10', billingCycle: 'March 2026', unpaidCount: 0, totalDueMinor: 0, expectedRevenueMinor: 220000, pendingBillCount: 2 },
  },
  {
    label: 'Overdue — unpaid statement',
    membership: MEMBERSHIP_SUN_CLUB,
    opData: { status: 'overdue', nextDueDate: '2026-03-10', billingCycle: 'March 2026', unpaidCount: 1, totalDueMinor: 180000, expectedRevenueMinor: 485000, pendingBillCount: 0 },
  },
  {
    label: 'Long property name',
    membership: MEMBERSHIP_LONG_NAME,
    opData: { status: 'healthy', nextDueDate: '2026-04-10', billingCycle: 'March 2026', unpaidCount: 0, totalDueMinor: 0, expectedRevenueMinor: 310000, pendingBillCount: 0 },
  },
]

// -- Setup variants --

export interface SetupVariant {
  label: string
  membership: MembershipWithProperty
  progress: PropertySetupProgress
  pendingInvites: PendingInvite[]
}

export const SETUP_VARIANTS: SetupVariant[] = [
  {
    label: 'Just created — no tenants, no charges',
    membership: MEMBERSHIP_SUN_CLUB,
    progress: { propertyCreated: true, tenantsInvited: false, tenantsAccepted: false, chargesConfigured: false, firstStatementPublished: false },
    pendingInvites: [],
  },
  {
    label: 'Tenant invited, pending acceptance',
    membership: MEMBERSHIP_RUA_AUGUSTA,
    progress: { propertyCreated: true, tenantsInvited: true, tenantsAccepted: false, chargesConfigured: true, firstStatementPublished: false },
    pendingInvites: [{ email: 'maria@example.com', name: 'Maria Silva', sentAt: '2026-03-25T08:00:00Z' }],
  },
  {
    label: 'Charges configured, no tenants',
    membership: MEMBERSHIP_SUN_CLUB,
    progress: { propertyCreated: true, tenantsInvited: false, tenantsAccepted: false, chargesConfigured: true, firstStatementPublished: false },
    pendingInvites: [],
  },
  {
    label: 'Fully set up, first statement pending',
    membership: MEMBERSHIP_RUA_AUGUSTA,
    progress: { propertyCreated: true, tenantsInvited: true, tenantsAccepted: true, chargesConfigured: true, firstStatementPublished: false },
    pendingInvites: [],
  },
]

// =============================================================================
// Urgent action variants
// =============================================================================

export const URGENT_ACTION_VARIANTS: { label: string; actions: UrgentAction[] }[] = [
  {
    label: 'Overdue payment',
    actions: [{
      type: 'overdue_payment',
      propertyId: 'prop-1',
      propertyName: 'Sun Club 7127',
      title: 'Overdue payment — Erica Faust',
      description: 'March statement is 5 days overdue. R$ 1.800',
    }],
  },
  {
    label: 'Payment claim',
    actions: [{
      type: 'payment_claim',
      propertyId: 'prop-1',
      propertyName: 'Sun Club 7127',
      title: 'Payment claim to review',
      description: 'João marked March as paid via Pix.',
    }],
  },
  {
    label: 'Dispute',
    actions: [{
      type: 'dispute',
      propertyId: 'prop-2',
      propertyName: 'Rua Augusta 123',
      title: 'Charge disputed',
      description: 'Maria questioned the electric charge (R$ 342).',
    }],
  },
  {
    label: 'Bill review',
    actions: [{
      type: 'bill_review',
      propertyId: 'prop-1',
      propertyName: 'Sun Club 7127',
      title: 'Bill needs review',
      description: 'Electric bill extraction has low confidence.',
    }],
  },
  {
    label: 'Multiple actions',
    actions: [
      {
        type: 'overdue_payment',
        propertyId: 'prop-1',
        propertyName: 'Sun Club 7127',
        title: 'Overdue payment — Erica Faust',
        description: 'March statement is 5 days overdue. R$ 1.800',
      },
      {
        type: 'payment_claim',
        propertyId: 'prop-1',
        propertyName: 'Sun Club 7127',
        title: 'Payment claim to review',
        description: 'João marked March as paid via Pix.',
      },
      {
        type: 'dispute',
        propertyId: 'prop-2',
        propertyName: 'Rua Augusta 123',
        title: 'Charge disputed',
        description: 'Maria questioned the electric charge (R$ 342).',
      },
    ],
  },
]
