-- Update RPC to accept due_day parameter for the unit
drop function if exists create_property_with_membership;

create function create_property_with_membership(
  p_name text,
  p_street text default null,
  p_number text default null,
  p_complement text default null,
  p_neighborhood text default null,
  p_city text default null,
  p_state text default null,
  p_postal_code text default null,
  p_country_code text default 'BR',
  p_due_day integer default 10
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_property_id uuid;
  v_unit_id uuid;
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  insert into properties (
    name, street, number, complement, neighborhood,
    city, state, postal_code, country_code,
    created_by
  ) values (
    p_name, p_street, p_number, p_complement, p_neighborhood,
    p_city, p_state, p_postal_code, p_country_code,
    v_user_id
  ) returning id into v_property_id;

  insert into units (property_id, name, due_day_of_month)
  values (v_property_id, p_name, p_due_day)
  returning id into v_unit_id;

  insert into memberships (user_id, property_id, role)
  values (v_user_id, v_property_id, 'landlord');

  return json_build_object('property_id', v_property_id, 'unit_id', v_unit_id);
end;
$$;
