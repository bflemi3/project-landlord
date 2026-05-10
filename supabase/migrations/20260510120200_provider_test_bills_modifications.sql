-- =============================================================================
-- Property creation persistence: provider_test_bills modifications.
-- Spec: docs/superpowers/specs/2026-05-08-property-creation-persistence-design.md
--   §Migration ordering, step 3.
-- =============================================================================

-- Add provider_request_id (links bill to its originating request) and
-- upload_status (tracks the post-RPC upload state).
alter table provider_test_bills
  add column provider_request_id uuid references provider_requests(id) on delete cascade,
  add column upload_status file_upload_status not null default 'pending';

create index idx_provider_test_bills_provider_request_id
  on provider_test_bills(provider_request_id);

-- Existing rows are engineer/playground uploads; assume they're on disk.
-- Backfill protects existing readers (test runner, playground UI) from the
-- new gating once any consumer reads upload_status.
update provider_test_bills set upload_status = 'uploaded';

-- The wizard supplies actual mime types (PDF or image). Drop the PDF default
-- and constrain to the allowlist that the contracts bucket also accepts.
alter table provider_test_bills alter column mime_type drop default;

alter table provider_test_bills add constraint provider_test_bills_mime_type_allowed check (
  mime_type in ('application/pdf', 'image/jpeg', 'image/png', 'image/webp')
);

-- Allow own-row UPDATE for upload_status flips. The existing INSERT/SELECT
-- policies already exist; this fills in the missing UPDATE path the server
-- action needs after Storage upload completes. The with-check clamps the
-- target status to 'uploaded' or 'failed' so a row can never regress to
-- 'pending'. Engineers retain full UPDATE via the existing engineer policy.
create policy "Users can update upload_status on own test bills"
  on provider_test_bills for update
  using (uploaded_by = auth.uid())
  with check (
    uploaded_by = auth.uid()
    and upload_status in ('uploaded', 'failed')
  );
