import type { MembershipWithProperty } from '@/lib/hooks/use-memberships'
export type { PropertySetupProgress, PendingInvite, UrgentAction, PropertyStatus, PropertyOperationalData } from '@/lib/types/property'
import type { PropertySetupProgress, PendingInvite, UrgentAction, PropertyOperationalData } from '@/lib/types/property'

export interface HomeScreenData {
  firstName: string
  memberships: MembershipWithProperty[]
  setupProgress: Record<string, PropertySetupProgress> // keyed by property ID
  pendingInvites: Record<string, PendingInvite[]> // keyed by property ID
  chargeCount: Record<string, number> // keyed by property ID
  operationalData?: Record<string, PropertyOperationalData> // keyed by property ID
  urgentActions?: UrgentAction[]
}

// =============================================================================
// Mock data for each case
// =============================================================================

export const PREVIEW_STATES: Record<string, { label: string; description: string; data: HomeScreenData }> = {
  'empty': {
    label: 'No properties',
    description: 'Brand new user, just signed up. Sees role choice.',
    data: {
      firstName: 'Brandon',
      memberships: [],
      setupProgress: {},
      pendingInvites: {},
      chargeCount: {},
    },
  },

  'one-incomplete-no-tenants-no-charges': {
    label: '1 property — no tenants, no charges',
    description: 'Created property but skipped tenants and charges.',
    data: {
      firstName: 'Brandon',
      memberships: [{
        id: 'mem-1',
        role: 'landlord',
        property: { id: 'prop-1', name: 'Sun Club 7127', street: 'Avenida Campeche', number: '533', city: 'Florianópolis', state: 'SC' },
      }],
      setupProgress: {
        'prop-1': { propertyCreated: true, tenantsInvited: false, tenantsAccepted: false, chargesConfigured: false, firstStatementPublished: false },
      },
      pendingInvites: {},
      chargeCount: {},
    },
  },

  'one-incomplete-invited-pending': {
    label: '1 property — tenant invited, pending',
    description: 'Invited a tenant but they haven\'t accepted yet. Charges configured.',
    data: {
      firstName: 'Brandon',
      memberships: [{
        id: 'mem-1',
        role: 'landlord',
        property: { id: 'prop-1', name: 'Sun Club 7127', street: 'Avenida Campeche', number: '533', city: 'Florianópolis', state: 'SC' },
      }],
      setupProgress: {
        'prop-1': { propertyCreated: true, tenantsInvited: true, tenantsAccepted: false, chargesConfigured: true, firstStatementPublished: false },
      },
      pendingInvites: {
        'prop-1': [{ email: 'erica@example.com', name: 'Erica Faust', sentAt: '2026-03-24T10:00:00Z' }],
      },
      chargeCount: { 'prop-1': 4 },
    },
  },

  'one-incomplete-charges-only': {
    label: '1 property — charges configured, no tenants',
    description: 'Set up charges but no tenants invited.',
    data: {
      firstName: 'Brandon',
      memberships: [{
        id: 'mem-1',
        role: 'landlord',
        property: { id: 'prop-1', name: 'Sun Club 7127', street: 'Avenida Campeche', number: '533', city: 'Florianópolis', state: 'SC' },
      }],
      setupProgress: {
        'prop-1': { propertyCreated: true, tenantsInvited: false, tenantsAccepted: false, chargesConfigured: true, firstStatementPublished: false },
      },
      pendingInvites: {},
      chargeCount: { 'prop-1': 7 },
    },
  },

  'one-setup-complete': {
    label: '1 property — fully set up, no statements yet',
    description: 'Tenants accepted, charges configured, ready to publish first statement.',
    data: {
      firstName: 'Brandon',
      memberships: [{
        id: 'mem-1',
        role: 'landlord',
        property: { id: 'prop-1', name: 'Sun Club 7127', street: 'Avenida Campeche', number: '533', city: 'Florianópolis', state: 'SC' },
      }],
      setupProgress: {
        'prop-1': { propertyCreated: true, tenantsInvited: true, tenantsAccepted: true, chargesConfigured: true, firstStatementPublished: false },
      },
      pendingInvites: {},
      chargeCount: { 'prop-1': 4 },
    },
  },

  'one-operating': {
    label: '1 property — actively operating',
    description: 'Statements published, payments flowing. Calm state.',
    data: {
      firstName: 'Brandon',
      memberships: [{
        id: 'mem-1',
        role: 'landlord',
        property: { id: 'prop-1', name: 'Sun Club 7127', street: 'Avenida Campeche', number: '533', city: 'Florianópolis', state: 'SC' },
      }],
      setupProgress: {
        'prop-1': { propertyCreated: true, tenantsInvited: true, tenantsAccepted: true, chargesConfigured: true, firstStatementPublished: true },
      },
      pendingInvites: {},
      chargeCount: { 'prop-1': 6 },
      operationalData: {
        'prop-1': { status: 'healthy', nextDueDate: '2026-04-10', billingCycle: 'March 2026', unpaidCount: 0, totalDueMinor: 0, expectedRevenueMinor: 320000, pendingBillCount: 0 },
      },
    },
  },

  'multi-all-setup': {
    label: 'Multiple properties — all set up',
    description: 'Three properties, all fully configured and operating.',
    data: {
      firstName: 'Brandon',
      memberships: [
        {
          id: 'mem-1',
          role: 'landlord',
          property: { id: 'prop-1', name: 'Sun Club 7127', street: 'Avenida Campeche', number: '533', city: 'Florianópolis', state: 'SC' },
        },
        {
          id: 'mem-2',
          role: 'landlord',
          property: { id: 'prop-2', name: 'Rua Augusta 123', street: 'Rua Augusta', number: '123', city: 'São Paulo', state: 'SP' },
        },
        {
          id: 'mem-3',
          role: 'landlord',
          property: { id: 'prop-3', name: 'Beach House', street: 'Rua das Flores', number: '45', city: 'Rio de Janeiro', state: 'RJ' },
        },
      ],
      setupProgress: {
        'prop-1': { propertyCreated: true, tenantsInvited: true, tenantsAccepted: true, chargesConfigured: true, firstStatementPublished: true },
        'prop-2': { propertyCreated: true, tenantsInvited: true, tenantsAccepted: true, chargesConfigured: true, firstStatementPublished: true },
        'prop-3': { propertyCreated: true, tenantsInvited: true, tenantsAccepted: true, chargesConfigured: true, firstStatementPublished: true },
      },
      pendingInvites: {},
      chargeCount: { 'prop-1': 6, 'prop-2': 3, 'prop-3': 4 },
      operationalData: {
        'prop-1': { status: 'healthy', nextDueDate: '2026-04-10', billingCycle: 'March 2026', unpaidCount: 0, totalDueMinor: 0, expectedRevenueMinor: 485000, pendingBillCount: 0 },
        'prop-2': { status: 'healthy', nextDueDate: '2026-04-10', billingCycle: 'March 2026', unpaidCount: 0, totalDueMinor: 0, expectedRevenueMinor: 220000, pendingBillCount: 2 },
        'prop-3': { status: 'healthy', nextDueDate: '2026-04-10', billingCycle: 'March 2026', unpaidCount: 0, totalDueMinor: 0, expectedRevenueMinor: 180000, pendingBillCount: 0 },
      },
    },
  },

  'multi-mixed': {
    label: 'Multiple properties — mixed setup states',
    description: 'Two properties: one operating, one just created with pending invite.',
    data: {
      firstName: 'Brandon',
      memberships: [
        {
          id: 'mem-1',
          role: 'landlord',
          property: { id: 'prop-1', name: 'Sun Club 7127', street: 'Avenida Campeche', number: '533', city: 'Florianópolis', state: 'SC' },
        },
        {
          id: 'mem-2',
          role: 'landlord',
          property: { id: 'prop-2', name: 'Rua Augusta 123', street: 'Rua Augusta', number: '123', city: 'São Paulo', state: 'SP' },
        },
      ],
      setupProgress: {
        'prop-1': { propertyCreated: true, tenantsInvited: true, tenantsAccepted: true, chargesConfigured: true, firstStatementPublished: true },
        'prop-2': { propertyCreated: true, tenantsInvited: true, tenantsAccepted: false, chargesConfigured: false, firstStatementPublished: false },
      },
      pendingInvites: {
        'prop-2': [{ email: 'maria@example.com', name: 'Maria Silva', sentAt: '2026-03-25T08:00:00Z' }],
      },
      chargeCount: { 'prop-1': 6, 'prop-2': 0 },
      operationalData: {
        'prop-1': { status: 'healthy', nextDueDate: '2026-04-10', billingCycle: 'March 2026', unpaidCount: 0, totalDueMinor: 0, expectedRevenueMinor: 485000, pendingBillCount: 0 },
      },
    },
  },

  'multi-urgent': {
    label: 'Multiple properties — urgent actions',
    description: 'Properties operating but with overdue payments and disputes.',
    data: {
      firstName: 'Brandon',
      memberships: [
        {
          id: 'mem-1',
          role: 'landlord',
          property: { id: 'prop-1', name: 'Sun Club 7127', street: 'Avenida Campeche', number: '533', city: 'Florianópolis', state: 'SC' },
        },
        {
          id: 'mem-2',
          role: 'landlord',
          property: { id: 'prop-2', name: 'Rua Augusta 123', street: 'Rua Augusta', number: '123', city: 'São Paulo', state: 'SP' },
        },
      ],
      setupProgress: {
        'prop-1': { propertyCreated: true, tenantsInvited: true, tenantsAccepted: true, chargesConfigured: true, firstStatementPublished: true },
        'prop-2': { propertyCreated: true, tenantsInvited: true, tenantsAccepted: true, chargesConfigured: true, firstStatementPublished: true },
      },
      pendingInvites: {},
      chargeCount: { 'prop-1': 6, 'prop-2': 3 },
      operationalData: {
        'prop-1': { status: 'overdue', nextDueDate: '2026-03-10', billingCycle: 'March 2026', unpaidCount: 1, totalDueMinor: 180000, expectedRevenueMinor: 485000, pendingBillCount: 0 },
        'prop-2': { status: 'attention', nextDueDate: '2026-04-10', billingCycle: 'March 2026', unpaidCount: 0, totalDueMinor: 0, expectedRevenueMinor: 220000, pendingBillCount: 1 },
      },
      urgentActions: [
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
  },
}
