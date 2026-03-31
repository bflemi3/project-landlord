-- =============================================================================
-- PRO-13: Add unit_id to invitations + atomic property creation RPC
-- =============================================================================

-- Add unit_id to invitations for property-scoped tenant invites
alter table invitations add column unit_id uuid references units(id) on delete cascade;
create index idx_invitations_unit_id on invitations(unit_id);

-- =============================================================================
-- RPC: create_property_with_membership
-- Atomically creates a property and the landlord's membership.
-- Solves the RLS chicken-and-egg problem: the memberships INSERT policy
-- requires is_property_landlord(), but no membership exists yet.
-- =============================================================================
create or replace function create_property_with_membership(
  p_name text,
  p_street text default null,
  p_number text default null,
  p_complement text default null,
  p_neighborhood text default null,
  p_city text default null,
  p_state text default null,
  p_postal_code text default null,
  p_country_code text default 'BR',
  p_currency text default 'BRL'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_property_id uuid;
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Create the property
  insert into properties (
    name, street, number, complement, neighborhood,
    city, state, postal_code, country_code, currency,
    created_by
  ) values (
    p_name, p_street, p_number, p_complement, p_neighborhood,
    p_city, p_state, p_postal_code, p_country_code, p_currency,
    v_user_id
  ) returning id into v_property_id;

  -- Create the landlord membership
  insert into memberships (user_id, property_id, role)
  values (v_user_id, v_property_id, 'landlord');

  return v_property_id;
end;
$$;

-- Grant execute to authenticated users
grant execute on function create_property_with_membership to authenticated;
