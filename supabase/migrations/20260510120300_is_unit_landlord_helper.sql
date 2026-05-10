-- =============================================================================
-- Property creation persistence: is_unit_landlord(uuid) RLS helper.
-- Spec: docs/superpowers/specs/2026-05-08-property-creation-persistence-design.md
--   §Migration ordering, step 9 (landed early so contracts and rent RLS can
--   use it). The other unit/property helpers don't join because they read the
--   memberships row directly. is_unit_landlord MUST join through units
--   because by convention landlord memberships have unit_id IS NULL (scoped
--   to the property, not any specific unit).
-- =============================================================================

create or replace function is_unit_landlord(p_unit_id uuid)
returns boolean as $$
  select exists (
    select 1
    from memberships m
    join units u on u.property_id = m.property_id
    where u.id = p_unit_id
      and m.user_id = auth.uid()
      and m.role = 'landlord'
      and m.deleted_at is null
  );
$$ language sql security definer stable;

comment on function is_unit_landlord(uuid) is
  'True iff auth.uid() has a landlord membership on the property of the given '
  'unit. Joins through units because landlord memberships have unit_id IS NULL '
  'by convention.';
