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
  due_day_of_month integer not null check (due_day_of_month between 1 and 31),
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
-- Safe now that the rent table carries it. The pre-flight audit in step 6
-- confirms no charge_type='rent' rows exist; legacy units.due_day_of_month
-- values are not auto-backfilled into rent because the wizard hasn't shipped.
-- =============================================================================
alter table units drop column due_day_of_month;
