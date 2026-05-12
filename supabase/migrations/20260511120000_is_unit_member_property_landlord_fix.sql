-- =============================================================================
-- Fix: is_unit_member must recognize property-scoped landlord memberships.
--
-- Background
-- ----------
-- The original is_unit_member (20260327120000_memberships_unit_id.sql) matches
-- only memberships rows with `unit_id = p_unit_id`. That predicate excludes
-- property-scoped landlord memberships, which the new create_property RPC
-- (20260510121000_create_property_rpc.sql §5) inserts with `unit_id IS NULL`.
--
-- Symptom
-- -------
-- The contracts SELECT policy is `using (is_unit_member(unit_id))`. Postgres
-- RLS additionally enforces the SELECT policy on UPDATE statements that have a
-- WHERE clause or RETURNING (we issue both: `update ... where id = ? returning *`
-- through supabase-js). For a property-scoped landlord:
--   - is_unit_landlord(unit_id) returns TRUE (joins through units)
--   - is_unit_member(unit_id)   returns FALSE (no row with unit_id = p_unit_id)
-- The UPDATE policy USING clause passes, but the SELECT predicate fails on the
-- existing row, so the statement silently returns 0 rows. The contract-upload
-- path's post-upload `update contracts set upload_status = 'uploaded'` is
-- silently rejected — every contract appears as `failed` in the success screen.
-- Same shape applies to `rent` SELECT and to the `contracts` Storage bucket
-- read policy (20260510120500_rent_table.sql, 20260510120900_contracts_storage_bucket.sql).
--
-- Fix
-- ---
-- Rewrite is_unit_member to recognize two membership shapes:
--   1. Direct unit-scoped membership: memberships.unit_id = p_unit_id (the
--      original semantic — tenants always have unit_id set; legacy landlords
--      from the 20260327120000 backfill carry a unit_id too).
--   2. Property-scoped landlord membership: any row with role='landlord' and
--      unit_id IS NULL whose property_id matches the unit's property (joining
--      through units). This mirrors is_unit_landlord's shape.
--
-- Why this is safe for tenant scoping
-- -----------------------------------
-- Tenants are never inserted with unit_id IS NULL. The redeem-invite RPC
-- (20260420154115_redeem_invite_rpc.sql:73-79) requires `v_invite.unit_id is
-- not null` before inserting the tenant membership. The new create_property
-- RPC inserts only the landlord membership; tenant rows are created later via
-- redeem-invite. Therefore the `role = 'landlord'` clause on the property-
-- scoped branch keeps tenants strictly unit-bound.
--
-- Why fix the helper, not the RPC or the policy
-- ---------------------------------------------
-- - The RPC's `unit_id IS NULL` insert is the documented post-pivot convention
--   (per the property-creation-persistence spec and the inline comment in §5).
-- - The contracts/rent/storage policies are written in terms of unit-scoped
--   helpers — that pattern is intentional and used elsewhere. Rewriting them
--   would diverge from the codebase's RLS idiom.
-- - The helper is the natural home for the dual-shape lookup; is_unit_landlord
--   already takes the same shape (and was designed to). The asymmetry between
--   is_unit_member and is_unit_landlord is the bug.
--
-- Forward-only. No data changes. Idempotent via CREATE OR REPLACE.
-- =============================================================================

create or replace function is_unit_member(p_unit_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select
    -- Direct unit-scoped membership (tenants; legacy backfilled landlords).
    exists (
      select 1
      from memberships m
      where m.unit_id = p_unit_id
        and m.user_id = auth.uid()
        and m.deleted_at is null
    )
    -- Property-scoped landlord membership (post-pivot insertion convention
    -- from create_property RPC; unit_id IS NULL, resolved via units join).
    or exists (
      select 1
      from memberships m
      join units u on u.property_id = m.property_id
      where u.id = p_unit_id
        and m.user_id = auth.uid()
        and m.role = 'landlord'
        and m.unit_id is null
        and m.deleted_at is null
    );
$$;

comment on function is_unit_member(uuid) is
  'True iff auth.uid() can see the given unit. Recognizes both direct '
  'unit-scoped memberships (tenants; legacy backfilled landlords with '
  'unit_id set) and property-scoped landlord memberships (post-pivot '
  'create_property RPC convention, unit_id IS NULL; resolved via units '
  'join). Symmetric with is_unit_landlord. See migration '
  '20260511120000_is_unit_member_property_landlord_fix.sql.';
