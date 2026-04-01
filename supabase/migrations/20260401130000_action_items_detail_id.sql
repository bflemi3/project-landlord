-- Add detail_id to home_action_items view for targeting specific items
-- Must drop and recreate because CREATE OR REPLACE cannot reorder columns
drop view if exists home_action_items;

create view home_action_items with (security_invoker = true) as
-- Properties with no tenants and no pending invites → "Invite tenants"
select
  'invite_tenants' as action_type,
  p.id as property_id,
  p.name as property_name,
  null::uuid as detail_id,
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
  null::uuid as detail_id,
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

-- Pending invitations → one row per pending invite
select
  'pending_invite' as action_type,
  p.id as property_id,
  p.name as property_name,
  i.id as detail_id,
  i.invited_name as detail_name,
  i.invited_email as detail_email,
  i.created_at as detail_date
from memberships m
join properties p on p.id = m.property_id and p.deleted_at is null
join invitations i on i.property_id = p.id and i.status = 'pending'
where m.user_id = auth.uid()
  and m.role = 'landlord'
  and m.deleted_at is null;
