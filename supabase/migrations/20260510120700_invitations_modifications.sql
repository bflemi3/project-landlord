-- =============================================================================
-- Property creation persistence: invitations modifications.
-- Spec: docs/superpowers/specs/2026-05-08-property-creation-persistence-design.md
--   §Migration ordering, step 7. The 'not_invited' status value was added in
--   step 1 (enums migration).
-- =============================================================================

alter table invitations
  add column tax_id text,
  add column last_emailed_at timestamptz;

comment on column invitations.tax_id is
  'Pre-fills tenant signup. Informational; no FK or unique constraint.';

comment on column invitations.last_emailed_at is
  'Powers email idempotency. Email sender consults this before re-sending '
  'and updates it on each send. Replay path uses a 5-minute debounce.';

-- Partial index targets the active path (the email idempotency lookup).
create index idx_invitations_last_emailed_at
  on invitations(last_emailed_at) where status = 'pending';

-- No backfill required — both columns nullable, no app dependency on existing
-- rows having values set.
