-- =============================================================================
-- Property creation persistence: charge_definitions modifications.
-- Spec: docs/superpowers/specs/2026-05-08-property-creation-persistence-design.md
--   §Migration ordering, step 6.
--
-- Pre-flight gate: this migration aborts if any charge_definitions row carries
-- charge_type = 'rent'. Rent left charge_definitions in the post-pivot model;
-- legacy rows must be cleaned up (deleted or backfilled) before this runs.
-- =============================================================================

do $$
declare
  v_rent_count integer;
begin
  select count(*) into v_rent_count
  from charge_definitions
  where charge_type = 'rent';

  if v_rent_count > 0 then
    raise exception
      'pre_flight_audit_failed: % charge_definitions row(s) carry charge_type=''rent''. '
      'Rent leaves charge_definitions in the post-pivot model. Either backfill those rows '
      'into the new rent table or treat as disposable test data, then re-run the migration.',
      v_rent_count;
  end if;
end;
$$;

-- =============================================================================
-- Drop charge_type column AND its enum. Pre-flight audit above proves the
-- column is empty of 'rent' rows; remaining 'recurring'/'variable' rows are
-- expressed via the new amount_behavior + expense_type columns.
--
-- Drop legacy provider_id column. Superseded by provider_profile_id and
-- provider_request_id below.
-- =============================================================================
alter table charge_definitions drop column charge_type;
drop type charge_type;

alter table charge_definitions drop column provider_id;

-- =============================================================================
-- Add new columns: expense_type (required), amount_behavior, provider
-- attachment fields, and bundle fields.
-- =============================================================================
alter table charge_definitions
  add column expense_type expense_type,
  add column amount_behavior expense_amount_behavior not null default 'unknown',
  add column provider_profile_id uuid references provider_invoice_profiles(id) on delete restrict,
  add column provider_request_id uuid references provider_requests(id) on delete set null,
  add column bundled_into_rent boolean not null default false,
  add column bundled_into_charge_id uuid references charge_definitions(id) on delete restrict;

-- expense_type starts nullable to permit the alter to land cleanly; tighten
-- to NOT NULL once any backfill is impossible (no existing rows to fix
-- since pre-flight cleared rent rows; remaining rows existed under the old
-- model and are local-test data only). Apply the NOT NULL via a separate
-- statement so partial test rollouts can backfill before constraining.
update charge_definitions set expense_type = 'other' where expense_type is null;
alter table charge_definitions alter column expense_type set not null;

create index idx_charge_definitions_provider_profile_id
  on charge_definitions(provider_profile_id);
create index idx_charge_definitions_provider_request_id
  on charge_definitions(provider_request_id);
create index idx_charge_definitions_bundled_into_charge_id
  on charge_definitions(bundled_into_charge_id);

-- Provider attachment is at-most-one of four states:
-- 1) provider_profile_id    (tracked)
-- 2) provider_request_id    (pending)
-- 3) bundled_into_rent      (rolled into rent total)
-- 4) bundled_into_charge_id (rolled into another charge)
-- All four absent = the unspecified state (recorded but no provider yet).
alter table charge_definitions add constraint charge_definitions_provider_attachment check (
  -- at most one of provider_profile / provider_request
  (provider_profile_id is null or provider_request_id is null)
  -- when bundled_into_rent, no other provider/request/charge link
  and (not bundled_into_rent or (
    provider_profile_id is null
    and provider_request_id is null
    and bundled_into_charge_id is null
  ))
  -- when bundled_into_charge_id, no provider/request link and not bundled into rent
  and (bundled_into_charge_id is null or (
    provider_profile_id is null
    and provider_request_id is null
    and bundled_into_rent = false
  ))
  -- bundled_into_charge_id cannot point at the same row (no self-bundle)
  and (bundled_into_charge_id is null or bundled_into_charge_id <> id)
);

-- =============================================================================
-- Now that charge_definitions.provider_request_id exists, replace the simpler
-- provider_requests SELECT policy with the full version (owner OR engineer
-- OR member-of-property-with-linked-charge). Spec §provider_requests RLS.
-- =============================================================================
drop policy if exists "Requesters and engineers read provider_requests"
  on provider_requests;

create policy "Requesters and linked members read provider_requests"
  on provider_requests for select
  using (
    requested_by = auth.uid()
    or exists (
      select 1 from engineer_allowlist where user_id = auth.uid()
    )
    or exists (
      select 1
      from charge_definitions cd
      join units u on u.id = cd.unit_id
      join memberships m on m.property_id = u.property_id
      where cd.provider_request_id = provider_requests.id
        and m.user_id = auth.uid()
        and m.deleted_at is null
    )
  );
