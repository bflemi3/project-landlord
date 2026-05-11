/**
 * Mock `SubmitSummary` fixtures used during local development of the
 * success screen while Phase 3 (the real `submitPropertyCreation` action)
 * is still in flight. Once the action ships, the success screen consumes
 * the action's response and these fixtures collapse into test data.
 */

import type { SubmitSummary } from '../server-errors'

const BASE_PROPERTY_ID = '11111111-1111-1111-1111-111111111111'
const BASE_UNIT_ID = '22222222-2222-2222-2222-222222222222'

/**
 * The "full house" fixture — every optional section populated. Useful for
 * eyeballing the success screen with all cards rendered.
 */
export const submitSummaryFull: SubmitSummary = {
  is_idempotent_replay: false,
  property_id: BASE_PROPERTY_ID,
  property_name: 'Rua Augusta, 123',
  property_address: {
    street: 'Rua Augusta',
    number: '123',
    complement: 'Apto 4B',
    neighborhood: 'Consolação',
    city: 'São Paulo',
    state: 'SP',
    postal_code: '01304-001',
    country_code: 'BR',
  },
  property_type: 'apartment',
  unit_id: BASE_UNIT_ID,
  contract: {
    contract_id: '33333333-3333-3333-3333-333333333333',
    storage_path: `${BASE_UNIT_ID}/33333333-3333-3333-3333-333333333333.pdf`,
    original_filename: 'rental-contract.pdf',
    upload_status: 'uploaded',
  },
  rent: {
    rent_id: '44444444-4444-4444-4444-444444444444',
    amount_minor: 260000,
    currency: 'BRL',
    due_day_of_month: 10,
    includes: ['condo', 'water'],
  },
  tenants: {
    invited_count: 2,
    deferred_count: 1,
    invitations_to_email: [
      '55555555-5555-5555-5555-555555555555',
      '66666666-6666-6666-6666-666666666666',
    ],
  },
  expenses: {
    count: 4,
    by_type: {
      electricity: 1,
      water: 1,
      condo: 1,
      internet: 1,
    },
    unspecified_count: 0,
    bundled_count: 0,
  },
  provider_requests: {
    new_count: 1,
    deduped_count: 0,
    bill_uploads: [],
  },
  tax_id_updated: true,
}

/**
 * Minimal fixture — only required sections (property + unit), no contract,
 * no rent, no tenants, no expenses, no provider requests. Reflects a
 * landlord who created a bare property and will fill in the rest later.
 */
export const submitSummaryMinimal: SubmitSummary = {
  is_idempotent_replay: false,
  property_id: BASE_PROPERTY_ID,
  property_name: 'Rua das Flores, 42',
  property_address: {
    street: 'Rua das Flores',
    number: '42',
    complement: null,
    neighborhood: null,
    city: 'Florianópolis',
    state: 'SC',
    postal_code: '88010-001',
    country_code: 'BR',
  },
  property_type: null,
  unit_id: BASE_UNIT_ID,
  contract: null,
  rent: null,
  tenants: {
    invited_count: 0,
    deferred_count: 0,
    invitations_to_email: [],
  },
  expenses: {
    count: 0,
    by_type: {},
    unspecified_count: 0,
    bundled_count: 0,
  },
  provider_requests: {
    new_count: 0,
    deduped_count: 0,
    bill_uploads: [],
  },
  tax_id_updated: false,
}

/**
 * Fixture showing the non-fatal warning surface — contract upload failed,
 * one invite email bounced, one provider-request bill upload failed.
 */
export const submitSummaryWithWarnings: SubmitSummary = {
  ...submitSummaryFull,
  contract: submitSummaryFull.contract
    ? {
        ...submitSummaryFull.contract,
        upload_status: 'failed',
        upload_failed: true,
      }
    : null,
  tenants: {
    ...submitSummaryFull.tenants,
    email_failed_count: 1,
  },
  provider_requests: {
    ...submitSummaryFull.provider_requests,
    new_count: 1,
    bill_uploads: [
      {
        test_bill_id: '77777777-7777-7777-7777-777777777777',
        storage_path: 'test-bills/77777777-7777-7777-7777-777777777777.pdf',
        mime_type: 'application/pdf',
      },
    ],
    bill_upload_failed_count: 1,
  },
}

/**
 * Idempotent replay fixture — `new_count` / `deduped_count` are `null` per
 * spec line 852. The screen renders the provider-requests note without
 * quoting numbers in this case.
 */
export const submitSummaryReplay: SubmitSummary = {
  ...submitSummaryFull,
  is_idempotent_replay: true,
  provider_requests: {
    new_count: null,
    deduped_count: null,
    bill_uploads: [],
  },
  tax_id_updated: false,
}
