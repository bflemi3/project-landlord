-- =============================================================================
-- 1. Generic audit trigger function
--    Fires on INSERT / UPDATE / DELETE, logs to audit_events.
--    Attach to any table that has an `id` UUID primary key.
-- =============================================================================

create or replace function audit_log_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_action audit_action;
  v_entity_id uuid;
  v_old jsonb := null;
  v_new jsonb := null;
begin
  -- Map TG_OP to our audit_action enum
  case TG_OP
    when 'INSERT' then
      v_action := 'create';
      v_entity_id := NEW.id;
      v_new := to_jsonb(NEW);
    when 'UPDATE' then
      v_action := 'update';
      v_entity_id := NEW.id;
      v_old := to_jsonb(OLD);
      v_new := to_jsonb(NEW);
    when 'DELETE' then
      v_action := 'delete';
      v_entity_id := OLD.id;
      v_old := to_jsonb(OLD);
  end case;

  insert into audit_events (actor_id, action, entity_type, entity_id, old_values, new_values)
  values (auth.uid(), v_action, TG_TABLE_NAME, v_entity_id, v_old, v_new);

  -- Return appropriate row so the operation proceeds
  if TG_OP = 'DELETE' then
    return OLD;
  end if;
  return NEW;
end;
$$;

-- =============================================================================
-- 2. Attach audit triggers to charge-related tables
-- =============================================================================

create trigger audit_charge_definitions
  after insert or update or delete on charge_definitions
  for each row execute function audit_log_trigger();

create trigger audit_recurring_rules
  after insert or update or delete on recurring_rules
  for each row execute function audit_log_trigger();

create trigger audit_responsibility_allocations
  after insert or update or delete on responsibility_allocations
  for each row execute function audit_log_trigger();

-- =============================================================================
-- 3. Add DELETE policy on responsibility_allocations for landlords
--    (Missing — blocks allocation replacement when switching payer modes)
-- =============================================================================

create policy "Landlords can delete allocations"
  on responsibility_allocations for delete using (
    exists (
      select 1 from charge_definitions cd
      join units u on u.id = cd.unit_id
      where cd.id = responsibility_allocations.charge_definition_id
        and is_property_landlord(u.property_id)
    )
  );
