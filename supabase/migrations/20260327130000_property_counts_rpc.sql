-- =============================================================================
-- VIEW: property_counts
-- =============================================================================
-- Per-property counts for charges, tenants, invites, and units.

create or replace view property_counts as
select
  p.id as property_id,
  (select count(*) from units u where u.property_id = p.id and u.deleted_at is null)::int as unit_count,
  (select count(*) from memberships m where m.property_id = p.id and m.role = 'tenant' and m.deleted_at is null)::int as tenant_count,
  (select count(*) from charge_definitions cd
    join units u on u.id = cd.unit_id
    where u.property_id = p.id and cd.deleted_at is null and u.deleted_at is null
  )::int as charge_count,
  (select count(*) from invitations i where i.property_id = p.id and i.status = 'pending')::int as pending_invite_count
from properties p
where p.deleted_at is null;

-- =============================================================================
-- VIEW: home_properties
-- =============================================================================
-- Everything the home page needs per property for the current user.
-- One row per unique property the user belongs to.

create or replace view home_properties with (security_invoker = true) as
select distinct on (p.id)
  p.id as property_id,
  p.name,
  p.city,
  p.state,
  m.role,
  pc.unit_count,
  pc.tenant_count,
  pc.charge_count,
  pc.pending_invite_count
from memberships m
join properties p on p.id = m.property_id and p.deleted_at is null
join property_counts pc on pc.property_id = p.id
where m.user_id = auth.uid()
  and m.deleted_at is null
order by p.id, m.created_at;

-- =============================================================================
-- VIEW: home_action_items
-- =============================================================================
-- Action items for the "What's Next" section on the home page.
-- Returns one row per actionable item across all the user's properties.
-- Action types: invite_tenants, configure_charges, pending_invite

create or replace view home_action_items with (security_invoker = true) as
-- Properties with no tenants and no pending invites → "Invite tenants"
select
  'invite_tenants' as action_type,
  p.id as property_id,
  p.name as property_name,
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

-- Pending invitations → "X is waiting to join"
select
  'pending_invite' as action_type,
  p.id as property_id,
  p.name as property_name,
  i.invited_name as detail_name,
  i.invited_email as detail_email,
  i.created_at as detail_date
from memberships m
join properties p on p.id = m.property_id and p.deleted_at is null
join invitations i on i.property_id = p.id and i.status = 'pending'
where m.user_id = auth.uid()
  and m.role = 'landlord'
  and m.deleted_at is null;
