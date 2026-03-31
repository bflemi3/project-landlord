-- =============================================================================
-- ADD unit_id TO MEMBERSHIPS
-- =============================================================================
-- Tenants are scoped to a specific unit within a property.
-- Landlords have property-level access (unit_id is null for landlords).
-- This migration adds the column, backfills existing data, updates constraints,
-- and adds a helper function for unit-scoped access checks.

-- 1. Add the column (nullable — landlords don't need a unit)
alter table memberships add column unit_id uuid references units(id) on delete cascade;

-- 2. Create index
create index idx_memberships_unit_id on memberships(unit_id);

-- 3. Backfill existing tenant memberships with the first unit of their property
update memberships m
set unit_id = (
  select u.id from units u
  where u.property_id = m.property_id
    and u.deleted_at is null
  order by u.created_at
  limit 1
)
where m.role = 'tenant' and m.unit_id is null;

-- 4. Backfill existing landlord memberships too (for consistency)
update memberships m
set unit_id = (
  select u.id from units u
  where u.property_id = m.property_id
    and u.deleted_at is null
  order by u.created_at
  limit 1
)
where m.role = 'landlord' and m.unit_id is null;

-- 5. Drop the old unique constraint and create a new one that includes unit_id
alter table memberships drop constraint memberships_user_id_property_id_key;
alter table memberships add constraint memberships_user_id_property_id_unit_id_key
  unique (user_id, property_id, unit_id);

-- 6. Helper function: check if user is a member of a specific unit
create or replace function is_unit_member(p_unit_id uuid)
returns boolean as $$
  select exists (
    select 1 from memberships
    where unit_id = p_unit_id
      and user_id = auth.uid()
      and deleted_at is null
  );
$$ language sql security definer stable;

-- 7. Update the property creation RPC to include unit_id in the membership
create or replace function create_property_with_unit(
  p_name text,
  p_street text default null,
  p_number text default null,
  p_complement text default null,
  p_neighborhood text default null,
  p_city text default null,
  p_state text default null,
  p_postal_code text default null,
  p_country_code text default 'BR'
)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_property_id uuid;
  v_unit_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Create the property
  insert into public.properties (name, street, number, complement, neighborhood, city, state, postal_code, country_code, created_by)
  values (p_name, p_street, p_number, p_complement, p_neighborhood, p_city, p_state, p_postal_code, p_country_code, v_user_id)
  returning id into v_property_id;

  -- Create the default unit (same name as property)
  insert into public.units (property_id, name)
  values (v_property_id, p_name)
  returning id into v_unit_id;

  -- Create the landlord membership (with unit_id)
  insert into public.memberships (user_id, property_id, unit_id, role)
  values (v_user_id, v_property_id, v_unit_id, 'landlord');

  return json_build_object('property_id', v_property_id, 'unit_id', v_unit_id);
end;
$$;
