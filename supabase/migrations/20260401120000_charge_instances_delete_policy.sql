-- Allow landlords to delete charge instances (needed for idempotent statement regeneration)
create policy "Landlords can delete charge instances"
  on charge_instances for delete using (
    exists (
      select 1 from statements s
      join units u on u.id = s.unit_id
      where s.id = charge_instances.statement_id
        and is_property_landlord(u.property_id)
    )
  );
