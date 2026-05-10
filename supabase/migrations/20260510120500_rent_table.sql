-- =============================================================================
-- Property creation persistence: rent table (UNIT-scoped, single FK).
-- Spec: docs/superpowers/specs/2026-05-08-property-creation-persistence-design.md
--   §Migration ordering, step 5.
-- Rent is per-tenancy (one rent row per active contract on a unit). Property
-- scope derives via units.property_id join — avoids the dual-FK consistency
-- risk without a payoff.
-- =============================================================================

create table rent (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references units(id) on delete cascade,
  amount_minor integer not null,
  currency text not null,
  due_day_of_month integer not null default 5 check (due_day_of_month between 1 and 31),
  start_date date,
  end_date date,
  -- IPCA / fixed adjustment metadata. All nullable: rent without an
  -- adjustment clause is valid.
  adjustment_frequency text,                           -- 'monthly' | 'quarterly' | 'biannual' | 'annual' | 'other'
  adjustment_method text,                              -- 'index' | 'fixed_amount' | 'fixed_percentage' | 'other'
  adjustment_index text,                               -- 'IPCA', 'CPI', etc., when method = 'index'
  adjustment_amount_minor integer,                     -- non-null only when method = 'fixed_amount'
  adjustment_basis_points integer,                     -- non-null only when method = 'fixed_percentage'
  -- Bundled-rent affordance: which expense_types are baked into rent.
  -- Empty array (or null) means rent is just rent.
  includes expense_type[],
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

comment on column rent.amount_minor is
  'Money in minor units (cents). Combined with currency. No floats.';

comment on column rent.adjustment_amount_minor is
  'Set only when adjustment_method = ''fixed_amount''. Adjustment value as a '
  'flat money increment in minor units.';

comment on column rent.adjustment_basis_points is
  'Set only when adjustment_method = ''fixed_percentage''. Adjustment value as '
  'basis points (0-10000 = 0%-100%).';

-- Exactly-one-non-null when method has a numeric value.
alter table rent add constraint rent_adjustment_value_consistency check (
  case adjustment_method
    when 'fixed_amount'     then adjustment_amount_minor is not null and adjustment_basis_points is null
    when 'fixed_percentage' then adjustment_basis_points is not null and adjustment_amount_minor is null
    when 'index'            then adjustment_amount_minor is null and adjustment_basis_points is null
    else                         adjustment_amount_minor is null and adjustment_basis_points is null
  end
);

create index idx_rent_unit_id on rent(unit_id);

-- =============================================================================
-- Row Level Security
-- =============================================================================
alter table rent enable row level security;

create policy "Unit members can view rent"
  on rent for select
  using (is_unit_member(unit_id));

create policy "Unit landlords can insert rent"
  on rent for insert
  with check (is_unit_landlord(unit_id));

create policy "Unit landlords can update rent"
  on rent for update
  using (is_unit_landlord(unit_id))
  with check (is_unit_landlord(unit_id));

create policy "Unit landlords can delete rent"
  on rent for delete
  using (is_unit_landlord(unit_id));

create trigger set_updated_at
  before update on rent
  for each row execute function update_updated_at();

-- =============================================================================
-- Backfill: migrate any pre-existing rent-typed charge_definitions rows into
-- the new rent table, then delete the source rows so the next migration's
-- pre-flight gate passes. The pre-flight gate in step 6 stays as the safety
-- net for anything that slips through.
--
-- Per-row mapping:
--   unit_id          = source.unit_id
--   amount_minor     = source.amount_minor (skipped + warned if NULL)
--   currency         = source.currency
--   due_day_of_month = the source unit's units.due_day_of_month (still exists
--                      at this point; column drop happens after this block)
--   created_by       = source.created_by if non-null, else the property's
--                      first landlord membership user_id
-- Source rows with no resolvable created_by (no row, no landlord) are
-- skipped + warned — manual intervention required.
--
-- Local dev runs are typically a no-op (any stray rent rows were already
-- deleted by the developer running the pre-flight). Production runs
-- exercise this block.
-- =============================================================================
do $$
declare
  v_row record;
  v_created_by uuid;
  v_due_day integer;
  v_migrated integer := 0;
  v_skipped_amount integer := 0;
  v_skipped_no_user integer := 0;
begin
  for v_row in
    select cd.id, cd.unit_id, cd.amount_minor, cd.currency, cd.created_at,
           cd.updated_at, u.due_day_of_month, u.property_id
    from charge_definitions cd
    join units u on u.id = cd.unit_id
    where cd.charge_type = 'rent'
  loop
    -- Skip rows we cannot persist faithfully: rent.amount_minor is NOT NULL.
    if v_row.amount_minor is null then
      v_skipped_amount := v_skipped_amount + 1;
      raise warning
        'rent backfill: skipping charge_definitions.id=% (unit=%) — amount_minor is NULL',
        v_row.id, v_row.unit_id;
      continue;
    end if;

    -- Resolve created_by: prefer source row's created_by; fall back to the
    -- property's first landlord. charge_definitions has no created_by column,
    -- so we go straight to the landlord lookup.
    select user_id into v_created_by
    from memberships
    where property_id = v_row.property_id
      and role = 'landlord'
      and deleted_at is null
    order by created_at
    limit 1;

    if v_created_by is null then
      v_skipped_no_user := v_skipped_no_user + 1;
      raise warning
        'rent backfill: skipping charge_definitions.id=% (unit=%, property=%) — no landlord membership found',
        v_row.id, v_row.unit_id, v_row.property_id;
      continue;
    end if;

    v_due_day := coalesce(v_row.due_day_of_month, 5);

    insert into rent (
      unit_id, amount_minor, currency, due_day_of_month, created_by,
      created_at, updated_at
    )
    values (
      v_row.unit_id, v_row.amount_minor, v_row.currency, v_due_day, v_created_by,
      v_row.created_at, v_row.updated_at
    );

    v_migrated := v_migrated + 1;
  end loop;

  raise notice
    'rent backfill: migrated=%, skipped_null_amount=%, skipped_no_user=%',
    v_migrated, v_skipped_amount, v_skipped_no_user;

  -- Delete the migrated source rows so the next migration's pre-flight gate
  -- (charge_definitions where charge_type='rent') returns zero. The
  -- charge_instances FK to charge_definitions is ON DELETE NO ACTION today;
  -- cascade-clean dependent instances first. (Anything left after this is
  -- one of the skipped categories above and will trip the pre-flight gate.)
  delete from charge_instances
  where charge_definition_id in (
    select id from charge_definitions where charge_type = 'rent'
  );

  delete from charge_definitions where charge_type = 'rent';
end;
$$;

-- =============================================================================
-- Drop legacy property-creation RPCs that reference units.due_day_of_month.
-- They are superseded by create_property in this PR train (per the spec's
-- deprecation step "delete both in the same PR"). Drop here so the
-- subsequent column drop can run cleanly.
-- =============================================================================
drop function if exists create_property_with_membership(
  text, text, text, text, text, text, text, text, text, integer
);

drop function if exists create_property_with_unit(
  text, text, text, text, text, text, text, text, text
);

-- =============================================================================
-- Drop units.due_day_of_month — moved to rent (per-tenancy concern).
-- Safe now that the rent table carries it and the backfill above has copied
-- the per-unit due day onto each migrated rent row.
-- =============================================================================
alter table units drop column due_day_of_month;
