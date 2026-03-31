-- =============================================================================
-- RPC to atomically replace responsibility allocations for a charge.
-- Deletes existing allocations and inserts new ones in a single transaction.
-- =============================================================================

create or replace function replace_allocations(
  p_charge_definition_id uuid,
  p_allocations jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_alloc jsonb;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Verify the caller is a landlord for this charge's property
  if not exists (
    select 1 from charge_definitions cd
    join units u on u.id = cd.unit_id
    join memberships m on m.property_id = u.property_id
    where cd.id = p_charge_definition_id
      and m.user_id = v_user_id
      and m.role = 'landlord'
      and m.deleted_at is null
  ) then
    raise exception 'Not authorized';
  end if;

  -- Delete existing allocations
  delete from responsibility_allocations
  where charge_definition_id = p_charge_definition_id;

  -- Insert new allocations
  for v_alloc in select * from jsonb_array_elements(p_allocations)
  loop
    insert into responsibility_allocations (
      charge_definition_id,
      role,
      allocation_type,
      percentage,
      fixed_minor
    ) values (
      p_charge_definition_id,
      (v_alloc->>'role')::user_role,
      (v_alloc->>'allocation_type')::split_type,
      (v_alloc->>'percentage')::integer,
      (v_alloc->>'fixed_minor')::integer
    );
  end loop;
end;
$$;
