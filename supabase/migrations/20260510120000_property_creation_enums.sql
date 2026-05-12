-- =============================================================================
-- Property creation persistence: enums and type additions.
-- Spec: docs/superpowers/specs/2026-05-08-property-creation-persistence-design.md
--   §Migration ordering, step 1.
-- =============================================================================

-- Shared file_upload_status: reused by contracts.upload_status and
-- provider_test_bills.upload_status. Generic name avoids a future rename
-- when bill- or contract-specific states (e.g., 'quarantined') land.
create type file_upload_status as enum ('pending', 'uploaded', 'failed');

-- Behavior of an expense's amount per billing period.
create type expense_amount_behavior as enum ('fixed', 'variable', 'unknown');

-- Source / status enums for provider_requests.
create type provider_request_source as enum (
  'user_new_provider',
  'user_correction',
  'engineer',
  'system'
);

create type provider_request_status as enum (
  'pending',
  'in_progress',
  'testing',
  'complete',
  'declined'
);

-- Add 'insurance' to expense_type. Position before 'maintenance' to match the
-- wizard's existing EXPENSE_TYPES ordering. The wizard already references
-- 'insurance'; without this enum value, persistence would fail.
alter type expense_type add value 'insurance' before 'maintenance';

-- Add 'not_invited' to invitation_status. Lets the landlord defer the email
-- send (saved tenant, no invitation email yet).
alter type invitation_status add value 'not_invited';
