-- Add generate_statement action type to home_action_items view
-- Shows when a unit has charges but no statement for the current month
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
  and m.deleted_at is null

union all

-- Units with charges but no statement for the current month → "Generate statement"
select
  'generate_statement' as action_type,
  p.id as property_id,
  p.name as property_name,
  u.id as detail_id,
  u.name as detail_name,
  null::text as detail_email,
  null::timestamptz as detail_date
from memberships m
join properties p on p.id = m.property_id and p.deleted_at is null
join units u on u.property_id = p.id and u.deleted_at is null
join property_counts pc on pc.property_id = p.id
where m.user_id = auth.uid()
  and m.role = 'landlord'
  and m.deleted_at is null
  and pc.charge_count > 0
  and not exists (
    select 1 from statements s
    where s.unit_id = u.id
      and s.period_year = extract(year from now())::int
      and s.period_month = extract(month from now())::int
      and s.deleted_at is null
  );
