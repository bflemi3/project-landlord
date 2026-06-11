-- =============================================================================
-- PRO-73: Remove statements; reshape charges into the discovery-driven ledger.
--
-- The statement draft/publish workflow is retired. A charge_instance is now the
-- ledger row (the obligation), created only when a bill or a payment is
-- DISCOVERED — never pre-generated per period. Payments move to their own table
-- (charge_payments) so a match stays reversible. Both unit members (tenant and
-- landlord — tenant is first-class) read+write the expense spine; only
-- landlords hard-delete the financial records (instances / payments).
--
-- DESTRUCTIVE OPERATIONS — see .claude/rules/database-migrations.md
--   What's destructive:
--     1. DROP TABLE statements, recurring_rules, payment_events.
--     2. TRUNCATE charge_instances CASCADE (clears instances + tenant_splits +
--        disputes) — statement-era rows are incompatible with the new shape
--        (charge_definition_id NOT NULL, issued_on NOT NULL).
--     3. DROP COLUMN charge_instances.statement_id; DROP TYPE statement_status,
--        payment_status; DROP + recreate payment_method.
--   Approval: explicitly authorized by the project owner. Pre-launch — the only
--     rows are local/test data under the retired statement model.
--   Rollback: forward-only. If a critical issue surfaces post-deploy, recover
--     via Supabase point-in-time restore of the affected tables (statements,
--     charge_instances, payment_events, tenant_splits, disputes) in sa-east-1.
--     Confirm a backup snapshot exists before `supabase db push --linked`.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Recreate home_action_items WITHOUT the generate_statement branch
--    (it sub-queries statements, so it must change before the table drops).
-- -----------------------------------------------------------------------------
drop view if exists home_action_items;

create view home_action_items with (security_invoker = true) as
-- Properties with no tenants and no pending invites → "Invite tenants"
select
  'invite_tenants' as action_type,
  p.id as property_id,
  p.name as property_name,
  null::uuid as detail_id,
  null::text as detail_name,
  null::text as detail_email,
  null::timestamptz as detail_date
from memberships m
join properties p on p.id = m.property_id and p.deleted_at is null
join property_counts pc on pc.property_id = p.id
where m.user_id = auth.uid()
  and m.role = 'landlord'
  and m.deleted_at is null
  and pc.tenant_count = 0
  and pc.pending_invite_count = 0

union all

-- Properties with no charges → "Set up charges"
select
  'configure_charges' as action_type,
  p.id as property_id,
  p.name as property_name,
  null::uuid as detail_id,
  null::text as detail_name,
  null::text as detail_email,
  null::timestamptz as detail_date
from memberships m
join properties p on p.id = m.property_id and p.deleted_at is null
join property_counts pc on pc.property_id = p.id
where m.user_id = auth.uid()
  and m.role = 'landlord'
  and m.deleted_at is null
  and pc.charge_count = 0

union all

-- Pending invitations → one row per pending invite
select
  'pending_invite' as action_type,
  p.id as property_id,
  p.name as property_name,
  i.id as detail_id,
  i.invited_name as detail_name,
  i.invited_email as detail_email,
  i.created_at as detail_date
from memberships m
join properties p on p.id = m.property_id and p.deleted_at is null
join invitations i on i.property_id = p.id and i.status = 'pending'
where m.user_id = auth.uid()
  and m.role = 'landlord'
  and m.deleted_at is null;

-- -----------------------------------------------------------------------------
-- 2. Drop policies on surviving tables that route through statements or are
--    being replaced. (Policies on statements / recurring_rules / payment_events
--    drop with their tables below.)
-- -----------------------------------------------------------------------------
drop policy if exists "Members can view charge instances" on charge_instances;
drop policy if exists "Landlords can manage charge instances" on charge_instances;
drop policy if exists "Landlords can update charge instances" on charge_instances;
drop policy if exists "Landlords can delete charge instances" on charge_instances;

drop policy if exists "Members can view splits" on tenant_splits;

drop policy if exists "Members can view disputes" on disputes;
drop policy if exists "Members can update disputes" on disputes;

drop policy if exists "Landlords can manage charge definitions" on charge_definitions;
drop policy if exists "Landlords can update charge definitions" on charge_definitions;

drop policy if exists "Landlords can manage allocations" on responsibility_allocations;
drop policy if exists "Landlords can update allocations" on responsibility_allocations;
drop policy if exists "Landlords can delete allocations" on responsibility_allocations;

-- -----------------------------------------------------------------------------
-- 3. Clear statement-era rows (cascades to tenant_splits + disputes).
-- -----------------------------------------------------------------------------
truncate table charge_instances cascade;

-- -----------------------------------------------------------------------------
-- 4. Drop retired tables.
-- -----------------------------------------------------------------------------
drop table payment_events;   -- FK→statements; its policies + triggers go with it
drop table recurring_rules;  -- dead batch-gen cadence; policies + audit trigger go

-- -----------------------------------------------------------------------------
-- 5. Reshape charge_instances → the discovered obligation (the ledger row).
-- -----------------------------------------------------------------------------
alter table charge_instances drop column statement_id;
drop index if exists idx_charge_instances_charge_definition_id;

alter table charge_instances
  alter column charge_definition_id set not null,
  add column issued_on date not null,
  add column due_date date;

comment on column charge_instances.issued_on is
  'Economic date the bill/charge was issued or discovered (shown in the ledger). Distinct from created_at = when the row was recorded.';
comment on column charge_instances.due_date is
  'Vencimento. NULL renders as "due" and never auto-overdue.';

create index idx_charge_instances_definition_issued
  on charge_instances (charge_definition_id, issued_on desc);

-- -----------------------------------------------------------------------------
-- 6. Drop statements (now unreferenced) + its enum.
-- -----------------------------------------------------------------------------
drop table statements;
drop type statement_status;

-- -----------------------------------------------------------------------------
-- 7. payment_method: drop + recreate without cards' absence — add debit/credit,
--    drop the now-orphaned payment_status. (payment_events, the only user, is
--    gone above.)
-- -----------------------------------------------------------------------------
drop type payment_status;
drop type payment_method;
create type payment_method as enum (
  'pix', 'debit_card', 'credit_card', 'bank_transfer', 'cash', 'other'
);

-- -----------------------------------------------------------------------------
-- 8. charge_payments — discovered settlement events on an instance. Separate
--    from charge_instances so a match is reversible (delete the row to unmatch).
-- -----------------------------------------------------------------------------
create table charge_payments (
  id uuid primary key default gen_random_uuid(),
  charge_instance_id uuid not null references charge_instances(id) on delete cascade,
  paid_by uuid not null references profiles(id),
  amount_minor integer not null,
  currency text not null default 'BRL',
  paid_on date not null,
  payment_method payment_method,
  receipt_file_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_charge_payments_charge_instance_id on charge_payments(charge_instance_id);

comment on column charge_payments.paid_on is
  'Economic date the payment occurred (bank transaction / receipt date). Distinct from created_at = when discovered/recorded.';
comment on column charge_payments.paid_by is
  'Profile the payment is attributed to (the paying party — landlord or tenant).';

alter table charge_payments enable row level security;

create trigger set_updated_at
  before update on charge_payments
  for each row execute function update_updated_at();

create trigger audit_charge_payments
  after insert or update or delete on charge_payments
  for each row execute function audit_log_trigger();

-- -----------------------------------------------------------------------------
-- 9. RLS — charge_instances. Two-sided read+write; landlord-only hard delete.
--    Authorized via charge_definition_id → units (no more statements).
-- -----------------------------------------------------------------------------
create policy "Members can view charge instances"
  on charge_instances for select using (
    exists (
      select 1 from charge_definitions cd
      join units u on u.id = cd.unit_id
      where cd.id = charge_instances.charge_definition_id
        and is_property_member(u.property_id)
    )
  );
create policy "Members can insert charge instances"
  on charge_instances for insert with check (
    exists (
      select 1 from charge_definitions cd
      join units u on u.id = cd.unit_id
      where cd.id = charge_instances.charge_definition_id
        and is_property_member(u.property_id)
    )
  );
create policy "Members can update charge instances"
  on charge_instances for update using (
    exists (
      select 1 from charge_definitions cd
      join units u on u.id = cd.unit_id
      where cd.id = charge_instances.charge_definition_id
        and is_property_member(u.property_id)
    )
  );
create policy "Landlords can delete charge instances"
  on charge_instances for delete using (
    exists (
      select 1 from charge_definitions cd
      join units u on u.id = cd.unit_id
      where cd.id = charge_instances.charge_definition_id
        and is_property_landlord(u.property_id)
    )
  );

create trigger audit_charge_instances
  after insert or update or delete on charge_instances
  for each row execute function audit_log_trigger();

-- -----------------------------------------------------------------------------
-- 10. RLS — charge_payments (via instance → definition → units).
-- -----------------------------------------------------------------------------
create policy "Members can view charge payments"
  on charge_payments for select using (
    exists (
      select 1 from charge_instances ci
      join charge_definitions cd on cd.id = ci.charge_definition_id
      join units u on u.id = cd.unit_id
      where ci.id = charge_payments.charge_instance_id
        and is_property_member(u.property_id)
    )
  );
create policy "Members can insert charge payments"
  on charge_payments for insert with check (
    exists (
      select 1 from charge_instances ci
      join charge_definitions cd on cd.id = ci.charge_definition_id
      join units u on u.id = cd.unit_id
      where ci.id = charge_payments.charge_instance_id
        and is_property_member(u.property_id)
    )
  );
create policy "Members can update charge payments"
  on charge_payments for update using (
    exists (
      select 1 from charge_instances ci
      join charge_definitions cd on cd.id = ci.charge_definition_id
      join units u on u.id = cd.unit_id
      where ci.id = charge_payments.charge_instance_id
        and is_property_member(u.property_id)
    )
  );
create policy "Landlords can delete charge payments"
  on charge_payments for delete using (
    exists (
      select 1 from charge_instances ci
      join charge_definitions cd on cd.id = ci.charge_definition_id
      join units u on u.id = cd.unit_id
      where ci.id = charge_payments.charge_instance_id
        and is_property_landlord(u.property_id)
    )
  );

-- -----------------------------------------------------------------------------
-- 11. RLS — charge_definitions. Members (both sides) write; member delete is
--     FK-guarded (charge_instances.charge_definition_id is ON DELETE NO ACTION,
--     so a definition with discovered bills can't be deleted). SELECT (member)
--     and the engineer "for all" policy are kept from earlier migrations.
-- -----------------------------------------------------------------------------
create policy "Members can insert charge definitions"
  on charge_definitions for insert with check (
    exists (select 1 from units where units.id = charge_definitions.unit_id and is_property_member(units.property_id))
  );
create policy "Members can update charge definitions"
  on charge_definitions for update using (
    exists (select 1 from units where units.id = charge_definitions.unit_id and is_property_member(units.property_id))
  );
create policy "Members can delete charge definitions"
  on charge_definitions for delete using (
    exists (select 1 from units where units.id = charge_definitions.unit_id and is_property_member(units.property_id))
  );

-- -----------------------------------------------------------------------------
-- 12. RLS — responsibility_allocations. Members write (incl. delete, for
--     payer-mode switches). SELECT (member) kept from foundation.
-- -----------------------------------------------------------------------------
create policy "Members can insert allocations"
  on responsibility_allocations for insert with check (
    exists (
      select 1 from charge_definitions cd
      join units u on u.id = cd.unit_id
      where cd.id = responsibility_allocations.charge_definition_id
        and is_property_member(u.property_id)
    )
  );
create policy "Members can update allocations"
  on responsibility_allocations for update using (
    exists (
      select 1 from charge_definitions cd
      join units u on u.id = cd.unit_id
      where cd.id = responsibility_allocations.charge_definition_id
        and is_property_member(u.property_id)
    )
  );
create policy "Members can delete allocations"
  on responsibility_allocations for delete using (
    exists (
      select 1 from charge_definitions cd
      join units u on u.id = cd.unit_id
      where cd.id = responsibility_allocations.charge_definition_id
        and is_property_member(u.property_id)
    )
  );

-- -----------------------------------------------------------------------------
-- 13. RLS rewrites forced by the statements drop: tenant_splits SELECT and
--     disputes SELECT/UPDATE re-routed via charge_definitions → units. Their
--     insert/update stay user-scoped (raised_by / user_id) and are unchanged.
-- -----------------------------------------------------------------------------
create policy "Members can view splits"
  on tenant_splits for select using (
    exists (
      select 1 from charge_instances ci
      join charge_definitions cd on cd.id = ci.charge_definition_id
      join units u on u.id = cd.unit_id
      where ci.id = tenant_splits.charge_instance_id
        and is_property_member(u.property_id)
    )
  );

create policy "Members can view disputes"
  on disputes for select using (
    exists (
      select 1 from charge_instances ci
      join charge_definitions cd on cd.id = ci.charge_definition_id
      join units u on u.id = cd.unit_id
      where ci.id = disputes.charge_instance_id
        and is_property_member(u.property_id)
    )
  );
create policy "Members can update disputes"
  on disputes for update using (
    exists (
      select 1 from charge_instances ci
      join charge_definitions cd on cd.id = ci.charge_definition_id
      join units u on u.id = cd.unit_id
      where ci.id = disputes.charge_instance_id
        and is_property_member(u.property_id)
    )
  );
