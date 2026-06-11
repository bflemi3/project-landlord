-- =============================================================================
-- PRO-73: drop charge_instances.name.
--
-- The column was a denormalized "Type · Provider" display string — two facts
-- (expense type + provider) baked into one text value that every producer
-- (seed, future LLM ingestion) would have to compose identically and the UI
-- was already splitting back apart. Display now derives from the definition:
-- charge_definitions.expense_type + the linked provider
-- (provider_invoice_profiles → providers, or provider_requests).
--
-- DESTRUCTIVE (approved by project owner 2026-06-11). Pre-launch: this era's
-- discovery-ledger migration already truncated charge_instances, so no
-- meaningful data is lost.
--
-- Rollback plan:
--   alter table charge_instances add column name text;
--   update charge_instances ci set name = cd.name
--     from charge_definitions cd where cd.id = ci.charge_definition_id;
--   alter table charge_instances alter column name set not null;
--   (then recreate charge_instances_with_payment_state as below — it selects ci.*)
--
-- The payment-state view selects ci.*, so it must be dropped and recreated
-- around the column drop.
-- =============================================================================

drop view charge_instances_with_payment_state;

alter table charge_instances drop column name;

create view charge_instances_with_payment_state
with (security_invoker = true) as
select
  ci.*,
  coalesce(pay.paid_minor, 0) as paid_minor,
  greatest(ci.amount_minor - coalesce(pay.paid_minor, 0), 0) as outstanding_minor
from charge_instances ci
left join lateral (
  select sum(cp.amount_minor)::integer as paid_minor
  from charge_payments cp
  where cp.charge_instance_id = ci.id
) pay on true;

comment on view charge_instances_with_payment_state is
  'charge_instances plus computed paid_minor / outstanding_minor (sum of charge_payments, floored at 0). Read-only row selection for the bills ledger; RLS via security_invoker.';
